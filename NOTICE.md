# NOTICE · 第三方依赖

> 本文件说明本仓库对第三方项目的依赖关系。**它不属于 [LICENSE](LICENSE) 的授权范围**——
> LICENSE 只覆盖本仓库自身的代码与文档。

## guizang-ppt-skill（运行时依赖，非再分发）

| | |
|---|---|
| 项目 | [`op7418/guizang-ppt-skill`](https://github.com/op7418/guizang-ppt-skill) |
| 作者 | 歸藏（[@op7418](https://x.com/op7418)） |
| 许可证 | **AGPL-3.0**（<https://www.gnu.org/licenses/agpl-3.0.html>） |
| 关系 | 本仓库在**运行时按路径调用**它，不包含它的任何代码、模板或文档资产 |

**使用者需自行获取该项目的合法副本。** 本仓库不代为分发。

### ⚠️ 打包分发会改变许可证要求

若你把本仓库与该引擎打包成**单一分发物**，或把上游资产复制进本仓库，则该分发整体构成
**AGPL-3.0 的衍生作品**，必须按 AGPL-3.0 授权，并保留上游署名与许可证全文。

这条边界是本仓库能选择 MIT 的唯一理由——详见
[`skills/ppt-maker/references/engine.md`](skills/ppt-maker/references/engine.md) 第二节。

## 为什么这段声明不写在 LICENSE 里

GitHub 的许可证识别要求 `LICENSE` 文件严格匹配标准模板。在 LICENSE 末尾追加自定义段落
会导致识别失败，仓库页面会显示"无许可证"——**那会让使用者不知道这份代码到底能不能用。**

所以标准 MIT 文本留在 `LICENSE`，第三方依赖声明放在这里。
