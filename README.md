# Eric Hart 个人网站

这是一个保留 vCard3 视觉布局、由 GitHub Pages 免费发布的静态个人网站。

## 中文内容管理后台

网站使用 [Pages CMS](https://app.pagescms.org/) 编辑内容。CMS 通过 GitHub App 获取仓库权限，保存时直接创建 Git 提交；网站代码中没有、也不需要保存 GitHub 令牌。

首次使用：

1. 打开 <https://app.pagescms.org/>，选择“使用 GitHub 登录”。
2. 按提示安装 Pages CMS GitHub App；仓库范围选择“仅选择的仓库”，只勾选 `eric-hart-ex.github.io`。
3. 在 Pages CMS 中打开 `eric-hart-ex/eric-hart-ex.github.io` 的 `main` 分支。
4. 打开“个人网站资料”，修改后点保存。保存会更新 `data/profile.json` 并提交到 GitHub。
5. GitHub Pages 通常会在几分钟内自动发布。可在仓库的 Actions 页面查看 `pages build and deployment` 状态。

目前可视化编辑：首页个人资料、学历信息、职业履历、专业技能和联系方式。`data/projects.json` 与 `data/posts.json` 是为作品和博客预留的数据接口，当前为空，也没有接入现有页面，因此不会改动现有作品和博客正文。

## 内容与页面关系

- `data/profile.json`：CMS 管理的结构化资料。
- `assets/js/site-content.js`：读取资料并更新现有 vCard3 页面。
- `.pages.yml`：中文编辑表单及保存规则。
- HTML 中保留当前文字作为备用内容；如果资料文件暂时无法加载，页面仍能正常显示。

## 发布与回退

Pages CMS 的每次保存都是独立 Git 提交。要回退误改，可在 GitHub 提交记录中打开对应提交并选择 Revert；回退提交合并到 `main` 后，GitHub Pages 会再次自动发布。
