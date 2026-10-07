"""Standard-library tests. Synthetic commits only; no network or JS execution."""
import copy
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('release', Path(__file__).with_name('release.py'))
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)


class ReleaseTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.parent = Path(self.temp.name)
        self.root = self.parent / 'repo'
        self.root.mkdir()
        shutil.copytree(release.ROOT / 'Plugins', self.root / 'Plugins')
        (self.root / 'release').mkdir()
        self.cfg = copy.deepcopy(release.load_config(release.ROOT))
        self.save_config()
        self.run_git('init', '-q')
        self.commit()
        self.cfg['source_commit'] = self.run_git('rev-parse', 'HEAD').strip()
        self.save_config()
        self.commit()
        self.sha = self.run_git('rev-parse', 'HEAD').strip()
        self.plugin = self.root / self.cfg['plugins'][0]['path']

    def run_git(self, *args):
        env = dict(os.environ, GIT_AUTHOR_NAME='Release tests', GIT_AUTHOR_EMAIL='tests@example.invalid',
                   GIT_COMMITTER_NAME='Release tests', GIT_COMMITTER_EMAIL='tests@example.invalid',
                   GIT_CONFIG_NOSYSTEM='1', GIT_CONFIG_GLOBAL=os.devnull)
        return subprocess.run(['git', '-C', str(self.root), *args], env=env, check=True,
                              stdout=subprocess.PIPE, stderr=subprocess.PIPE).stdout.decode()

    def commit(self):
        self.run_git('add', '--all')
        self.run_git('commit', '-q', '-m', 'Synthetic test fixture')

    def save_config(self):
        (self.root / release.CONFIG).write_bytes(release.json_bytes(self.cfg))

    def test_baseline_passes(self):
        cfg = release.validate(self.root)
        self.assertEqual(len(cfg['plugins']), len(self.cfg['plugins']))
        self.assertGreater(len(cfg['plugins']), 0)

    def test_missing_file_rejected(self):
        self.plugin.unlink()
        with self.assertRaisesRegex(release.ReleaseError, 'Missing or extra'):
            release.validate(self.root)

    def test_extra_js_outside_plugins_rejected(self):
        (self.root / 'extra.js').write_bytes(b'// unrelated')
        with self.assertRaisesRegex(release.ReleaseError, 'Missing or extra'):
            release.validate(self.root)

    def test_unlisted_variant_rejected(self):
        self.plugin.with_name('private-variant.js').write_bytes(self.plugin.read_bytes())
        with self.assertRaisesRegex(release.ReleaseError, 'Missing or extra'):
            release.validate(self.root)

    def test_extra_non_js_in_plugins_rejected(self):
        (self.plugin.parent / 'notes.txt').write_bytes(b'draft')
        with self.assertRaisesRegex(release.ReleaseError, 'Missing or extra'):
            release.validate(self.root)

    def test_hash_change_rejected(self):
        self.plugin.write_bytes(self.plugin.read_bytes() + b'\n')
        with self.assertRaisesRegex(release.ReleaseError, 'Plugin bytes differ'):
            release.validate(self.root)

    def test_secret_filename_rejected(self):
        (self.root / '.env.local').write_bytes(b'example')
        with self.assertRaisesRegex(release.ReleaseError, 'Credential-like filename'):
            release.validate(self.root)

    def test_secret_pattern_rejected_without_logging_value(self):
        fake = b'ghp_' + b'A' * 36
        self.plugin.write_bytes(b'// ' + fake)
        with self.assertRaises(release.ReleaseError) as result:
            release.validate(self.root)
        self.assertNotIn(fake.decode(), str(result.exception))
        self.assertIn('Possible credential', str(result.exception))

    def test_symlink_rejected(self):
        value = self.plugin.read_bytes()
        self.plugin.unlink()
        external = self.parent / 'external'
        external.write_bytes(value)
        self.plugin.symlink_to(external)
        with self.assertRaisesRegex(release.ReleaseError, 'Symlinks'):
            release.validate(self.root)

    def test_duplicate_channel_rejected(self):
        self.cfg['plugins'][1]['channel'] = self.cfg['plugins'][0]['channel']
        self.save_config()
        with self.assertRaisesRegex(release.ReleaseError, 'Duplicate'):
            release.validate(self.root)

    def test_path_traversal_rejected(self):
        self.cfg['plugins'][0]['path'] = '../outside.js'
        self.save_config()
        with self.assertRaisesRegex(release.ReleaseError, 'Invalid public plugin path'):
            release.validate(self.root)

    def test_package_preserves_bytes_and_is_deterministic(self):
        a, b = self.parent / 'a', self.parent / 'b'
        result = release.package(self.root, self.sha, a)
        release.package(self.root, self.sha, b)
        snapshot = lambda p: {x.relative_to(p).as_posix(): x.read_bytes() for x in p.rglob('*') if x.is_file()}
        self.assertEqual(snapshot(a), snapshot(b))
        self.assertEqual(len(snapshot(a)), len(self.cfg['plugins']) + 1)
        self.assertEqual(result['build_id'], 'git-' + self.sha)
        for item in result['plugins']:
            self.assertEqual((a / item['file']).read_bytes(), (self.root / item['path']).read_bytes())

    def test_existing_or_inside_repo_output_rejected(self):
        for output in (self.root / 'dist', self.parent):
            with self.assertRaises(release.ReleaseError):
                release.package(self.root, self.sha, output)

    def test_commit_must_be_exact_and_exist(self):
        for sha in ('HEAD', self.sha[:12], 'f' * 40):
            with self.assertRaises(release.ReleaseError):
                release.package(self.root, sha, self.parent / 'output')

    def test_changed_commit_cannot_use_old_hash_manifest(self):
        original = self.plugin.read_bytes()
        self.plugin.write_bytes(original + b'\n')
        self.commit()
        changed = self.run_git('rev-parse', 'HEAD').strip()
        self.plugin.write_bytes(original)
        with self.assertRaisesRegex(release.ReleaseError, 'Plugin bytes differ'):
            release.package(self.root, changed, self.parent / 'output')

    def test_refresh_from_committed_sources_is_deterministic(self):
        self.plugin.write_bytes(self.plugin.read_bytes() + b'\n')
        self.commit()
        changed = self.run_git('rev-parse', 'HEAD').strip()
        release.refresh(self.root, changed)
        first = (self.root / release.CONFIG).read_bytes()
        release.refresh(self.root, changed)
        self.assertEqual(first, (self.root / release.CONFIG).read_bytes())
        cfg = release.validate(self.root)
        self.assertEqual(cfg['source_commit'], changed)
        self.assertEqual(cfg['plugins'][0]['sha256'], hashlib.sha256(self.plugin.read_bytes()).hexdigest())
        self.commit()
        final = self.run_git('rev-parse', 'HEAD').strip()
        release.package(self.root, final, self.parent / 'output')

    def test_uncommitted_channel_mapping_rejected(self):
        self.cfg['plugins'][0]['channel'] = 'changed-channel'
        self.save_config()
        with self.assertRaisesRegex(release.ReleaseError, 'Manifest differs'):
            release.package(self.root, self.sha, self.parent / 'output')

    def test_refresh_rejects_uncommitted_plugin_changes(self):
        self.plugin.write_bytes(self.plugin.read_bytes() + b'\n')
        with self.assertRaisesRegex(release.ReleaseError, 'Working plugins differ'):
            release.refresh(self.root, self.sha)


if __name__ == '__main__':
    unittest.main()
