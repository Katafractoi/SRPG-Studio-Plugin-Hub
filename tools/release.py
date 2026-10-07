#!/usr/bin/env python3
"""Offline release validation/packaging. Never executes JS or contacts itch.io."""
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
CONFIG = Path('release/plugins.json')
PROJECT = 'katafract/katafracts-srpg-studio-plugin-hub'
SOURCE_PAGE = 'https://katafract.itch.io/katafracts-srpg-studio-plugin-hub'
# A narrow safety check, not a substitute for reviewing the public source diff.
SECRET_PATTERNS = (
    rb'-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----',
    rb'\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b',
    rb'\bAKIA[0-9A-Z]{16}\b',
    rb'(?i)\b(?:BUTLER_API_KEY|api_key|access_token|password)\s*[:=]\s*[\'"][^\'"\r\n]{8,}[\'"]',
)


class ReleaseError(ValueError):
    pass


def require(ok, message):
    if not ok:
        raise ReleaseError(message)


def json_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode('utf-8')


def load_config(root):
    cfg = json.loads((root / CONFIG).read_bytes())
    require(set(cfg) == {'schema', 'project', 'source_page', 'source_commit', 'plugins'}, 'Unexpected manifest fields')
    require(cfg['schema'] == 1 and cfg['project'] == PROJECT and cfg['source_page'] == SOURCE_PAGE, 'Unexpected release target')
    require(re.fullmatch(r'[0-9a-f]{40}', cfg['source_commit'] or '') is not None, 'Expected a full source commit SHA')
    require(isinstance(cfg['plugins'], list) and cfg['plugins'], 'Empty plugin allowlist')
    paths, channels, uploads = set(), set(), set()
    for item in cfg['plugins']:
        require(set(item) == {'path', 'channel', 'legacy_upload_id', 'bytes', 'sha256'}, 'Unexpected plugin fields')
        path = PurePosixPath(item['path'])
        require(len(path.parts) == 3 and path.parts[0] == 'Plugins' and path.parts[1] in {'Combat', 'Weapon-Item', 'UI'}
                and path.suffix == '.js' and str(path) == item['path'] and '\\' not in str(path), 'Invalid public plugin path')
        require(re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', item['channel']) is not None, 'Invalid channel')
        require(re.fullmatch(r'[0-9]+', item['legacy_upload_id']) is not None, 'Invalid legacy upload ID')
        require(item['path'] not in paths and item['channel'] not in channels and item['legacy_upload_id'] not in uploads, 'Duplicate path, channel, or legacy upload ID')
        require(type(item['bytes']) is int and item['bytes'] > 0 and re.fullmatch(r'[0-9a-f]{64}', item['sha256']) is not None, 'Invalid size or hash')
        paths.add(item['path']); channels.add(item['channel']); uploads.add(item['legacy_upload_id'])
    return cfg


def secret_filename(name):
    name = PurePosixPath(name).name.lower()
    return (name == '.env' or name.startswith('.env.') or name in {'butler_creds', 'credentials.json', 'id_rsa', 'id_ed25519'}
            or name.endswith(('.pem', '.key', '.p12', '.pfx')))


def audit_paths(paths, cfg):
    allowed = {x['path'] for x in cfg['plugins']}
    actual = {p for p in paths if p.startswith('Plugins/') or p.lower().endswith('.js')}
    require(actual == allowed, 'Missing or extra plugin/JS files; review the public allowlist')
    require(not any(secret_filename(p) for p in paths), 'Credential-like filename found; remove it before packaging')


def audit_bytes(data):
    for value in data.values():
        require(not any(re.search(pattern, value) for pattern in SECRET_PATTERNS), 'Possible credential found in plugin bytes; inspect privately')


def worktree_data(root, cfg):
    paths = []
    for base, directories, files in os.walk(root):
        directories[:] = [d for d in directories if not (Path(base) == root and d == '.git')]
        for name in directories + files:
            path = Path(base) / name
            require(not path.is_symlink(), 'Symlinks are not allowed in a release workspace')
        paths.extend((Path(base) / f).relative_to(root).as_posix() for f in files)
    audit_paths(paths, cfg)
    data = {x['path']: (root / x['path']).read_bytes() for x in cfg['plugins']}
    audit_bytes(data)
    return data


def git(root, *args):
    result = subprocess.run(['git', '-C', str(root), *args], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
    require(result.returncode == 0, 'Git read failed; use a checkout containing the full requested commit')
    return result.stdout


def commit_data(root, sha, cfg):
    require(re.fullmatch(r'[0-9a-f]{40}', sha or '') is not None, 'Use a full 40-character commit SHA')
    require(git(root, 'rev-parse', sha + '^{commit}').decode().strip() == sha, 'Expected an exact commit')
    paths = []
    for entry in git(root, 'ls-tree', '-rz', '--full-tree', sha).split(b'\0'):
        if not entry:
            continue
        meta, raw_path = entry.split(b'\t', 1)
        mode, kind, _ = meta.split()
        require(kind == b'blob' and mode in {b'100644', b'100755'}, 'Symlinks/submodules are not release inputs')
        paths.append(raw_path.decode('utf-8'))
    audit_paths(paths, cfg)
    data = {x['path']: git(root, 'show', sha + ':' + x['path']) for x in cfg['plugins']}
    audit_bytes(data)
    return data


def check_hashes(data, cfg):
    for item in cfg['plugins']:
        value = data[item['path']]
        require(len(value) == item['bytes'] and hashlib.sha256(value).hexdigest() == item['sha256'],
                'Plugin bytes differ from the reviewed manifest; refresh only after source review')


def validate(root):
    cfg = load_config(root)
    check_hashes(worktree_data(root, cfg), cfg)
    return cfg


def refresh(root, sha):
    cfg = load_config(root)
    data = commit_data(root, sha, cfg)
    require(worktree_data(root, cfg) == data, 'Working plugins differ from the selected source commit')
    cfg['source_commit'] = sha
    for item in cfg['plugins']:
        value = data[item['path']]
        item['bytes'] = len(value)
        item['sha256'] = hashlib.sha256(value).hexdigest()
    cfg['plugins'].sort(key=lambda x: x['path'])
    (root / CONFIG).write_bytes(json_bytes(cfg))


def package(root, sha, output):
    cfg = validate(root)
    data = commit_data(root, sha, cfg)
    require(git(root, 'show', sha + ':' + CONFIG.as_posix()) == (root / CONFIG).read_bytes(),
            'Manifest differs from the selected commit; commit and review the mapping first')
    check_hashes(data, cfg)
    # Compare against the recorded source commit too, so provenance is verifiable.
    check_hashes(commit_data(root, cfg['source_commit'], cfg), cfg)
    output = output.resolve()
    require(output != root and root not in output.parents, 'Use an output directory outside the repository')
    require(not output.exists(), 'Output already exists; choose a new empty destination')
    require(output.parent.is_dir(), 'Output parent must already exist')
    manifest = {'schema': 1, 'project': PROJECT, 'source_page': SOURCE_PAGE,
                'source_commit': sha, 'build_id': 'git-' + sha, 'plugins': []}
    with tempfile.TemporaryDirectory(prefix='.srpg-package-', dir=output.parent) as temporary:
        stage = Path(temporary) / 'package'
        stage.mkdir()
        for item in sorted(cfg['plugins'], key=lambda x: x['path']):
            filename = PurePosixPath(item['path']).name
            relative = 'channels/' + item['channel'] + '/' + filename
            target = stage / relative
            target.parent.mkdir(parents=True)
            target.write_bytes(data[item['path']])
            manifest['plugins'].append({k: item[k] for k in ('path', 'channel', 'bytes', 'sha256')} | {'file': relative})
        (stage / 'manifest.json').write_bytes(json_bytes(manifest))
        stage.rename(output)
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    commands.add_parser('validate')
    for command in ('refresh', 'package'):
        sub = commands.add_parser(command)
        sub.add_argument('--source-commit', required=True, help='Exact reviewed Git commit (40 lowercase hex characters)')
        if command == 'package':
            sub.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    try:
        if args.command == 'validate':
            cfg = validate(ROOT)
            print('PASS: %d public plugins match their recorded bytes and hashes' % len(cfg['plugins']))
        elif args.command == 'refresh':
            refresh(ROOT, args.source_commit)
            print('Updated release/plugins.json; review and commit this manifest separately')
        else:
            result = package(ROOT, args.source_commit, args.output)
            print('PASS: packaged %d plugins from %s; no uploads performed' % (len(result['plugins']), args.source_commit))
    except (ReleaseError, OSError, ValueError, KeyError, TypeError) as error:
        print('FAIL: ' + str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
