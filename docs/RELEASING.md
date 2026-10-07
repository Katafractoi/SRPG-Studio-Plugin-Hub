# GitHub + itch.io releases / 双端发布

GitHub holds the versioned source. The proposed itch.io channels serve the same individual `.js` files.  
GitHub 保存版本化源码；拟定的 itch.io 渠道提供同一份独立 `.js` 文件。

## Current stage / 当前阶段

This change only validates and packages files. It does not publish a GitHub Release, upload to itch.io, or access publishing credentials.  
本次只加入校验与打包，不创建 GitHub Release、不上传 itch.io，也不读取发布凭据。

`release/plugins.json` lists the 14 public paths, proposed stable channels, existing manual upload IDs, byte counts and SHA-256 hashes. Channel names are proposals until the initial migration is approved. `source_commit` identifies the recorded source snapshot. Generated `git-<full commit SHA>` build IDs identify source revisions, not plugin version numbers.  
`release/plugins.json` 列出 14 个公开路径、拟定固定渠道、现有手动上传 ID、字节数和 SHA-256。首次迁移确认前，渠道仅为方案。`source_commit` 标识源码快照；生成的 `git-<完整提交 SHA>` 是构建标识，不是插件版本号。

## Validate and prepare / 校验与准备

Use Python 3.9+ and Git. No Python packages are needed. Run from the repository root:  
需要 Python 3.9+ 和 Git，无需安装 Python 依赖。在仓库根目录运行：

```sh
python3 -m unittest discover -s tools -p 'test_*.py' -v
python3 tools/release.py validate
python3 tools/release.py package --source-commit FULL_COMMIT_SHA --output /tmp/srpg-release
```

Replace `FULL_COMMIT_SHA` with the exact reviewed 40-character commit SHA. The output must be a new directory outside the checkout. Fetch full history so both that commit and the recorded source commit are available.  
把 `FULL_COMMIT_SHA` 替换为已审阅的完整 40 位提交 SHA。输出必须是仓库外尚不存在的目录；检出完整历史，确保该提交及记录的源码提交均可读取。

The package contains `manifest.json` and one original file per `channels/<channel>/` directory. It is deterministic for the same commit and mapping. Plugin bytes, filenames, BOMs and line endings are preserved; plugin JavaScript is never executed. No repository archive or unlisted file is uploaded or included.  
输出包含 `manifest.json` 和每个 `channels/<channel>/` 目录中的原始单文件。同一提交与映射生成相同内容，保留文件名、原始字节、BOM 与换行；不会执行插件 JS，也不会收录未列出的文件。

Validation rejects missing/extra JS, extra files under `Plugins/`, symlinks, changed hashes, duplicate mappings, credential-like filenames and common secret patterns in plugin bytes. Secret scanning is deliberately limited; review the source diff before approving a release.  
校验会拒绝缺失或额外 JS、`Plugins/` 下额外文件、符号链接、哈希变化、重复映射、疑似凭据文件名及插件中的常见密钥格式。扫描不能替代发布前的源码审阅。

## Updating plugins / 更新插件

1. Review and commit the intended public source changes. Keep the channel mapping stable.  
   审阅并提交需要发布的公开源码变更，保持渠道映射稳定。
2. Regenerate hashes from that exact source commit, then review and commit the manifest change:  
   从该确切源码提交重新生成哈希，再审阅并提交清单变更：

   ```sh
   python3 tools/release.py refresh --source-commit FULL_SOURCE_COMMIT_SHA
   python3 tools/release.py validate
   ```

3. Package the final reviewed commit. The read-only GitHub workflow tests, validates, packages twice and compares the outputs. A passing check confirms packaging consistency, not in-engine gameplay behavior.  
   对最终审阅提交打包。只读 GitHub 工作流运行测试、校验及两次打包对比；通过代表打包一致性，不代表已完成引擎内功能测试。

Source changes intentionally fail the old hash check until the manifest is refreshed. This two-commit process keeps source provenance explicit and can be handled by the maintainer or an authorized assistant. Do not approve a manifest refresh just to silence an unexplained difference.  
源码变化会让旧哈希校验失败，更新清单后才恢复。先提交源码、再提交清单可明确溯源，由维护者或获授权助手处理；不要为消除报错而确认不明差异。

## Enable publishing later / 后续启用发布

- Approve the project/channel mapping and the first migration separately. Existing manual itch.io upload slots are not automatically overwritten by matching filenames. After the new channels are downloaded and verified, decide whether to hide or remove each old slot.  
  单独确认项目、渠道映射与首次迁移。同名文件不会自动覆盖既有手动上传槽位；新渠道下载校验通过后，再决定是否隐藏或删除旧槽位。
- Authorize butler through its official login flow. A browser login alone does not authorize CI. The `wharf` publishing grant is account-level, not restricted to this one project; do not substitute an unrestricted general API key. The account owner must approve the grant and enter its value directly into an approved GitHub Actions secret named `BUTLER_API_KEY`, never chat, source, or logs. This PR does not create that secret or change access settings.  
  通过官方登录流程授权 butler。浏览器已登录不等于 CI 已获授权。`wharf` 发布授权属于账户级，并非限定单项目；不要改用通用无限制 API key。账户所有者须亲自确认授权，并把值直接填入获批准的 GitHub Actions Secret `BUTLER_API_KEY`，不要放入聊天、源码或日志。本 PR 不创建密钥或修改权限。
- Before activation, review a separate manual-release workflow with an explicit release switch, exact commit, fixed target, concurrency protection, an approved pinned butler binary, and a hard failure when the publishing key is absent. Never expose the key to pull-request jobs. Regular pushes must remain validation-only until a separate publishing policy is approved.  
  启用前另行审阅手动发布工作流，明确发布开关、确切提交、固定目标、并发保护、经批准并锁定版本的 butler，以及缺少密钥时直接失败的检查。PR 任务不得接触发布密钥；另行确认发布策略前，普通 push 只做校验。
- Upload each staged `.js` to its stable channel, then verify the downloadable bytes and record the Git commit/build IDs. A multi-channel release is not atomic: on partial failure, report which channels succeeded and retry only under the same approved release scope.  
  将暂存的各 `.js` 上传到固定渠道，随后核验下载字节并记录 Git 提交及构建 ID。多渠道发布不是原子操作；部分失败时应报告成功渠道，并在同一获批发布范围内重试。

Butler supports direct single-file downloads and updates by channel. It does not maintain the project-page prose; use a stable link to this repository and [CHANGELOG.md](../CHANGELOG.md) for release details. Page edits need their own review.  
Butler 支持独立单文件下载及按渠道更新，但不维护项目页正文；发布详情可固定链接到此仓库及 [CHANGELOG.md](../CHANGELOG.md)，页面编辑另行审阅。

Official references / 官方说明: [single files](https://itch.io/docs/butler/single-files.html), [pushing and channels](https://itch.io/docs/butler/pushing.html), [authentication and CI](https://itch.io/docs/butler/login.html).
