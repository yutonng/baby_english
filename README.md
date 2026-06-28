# Little English H5

一个给中文母语儿童使用的英语启蒙 H5。当前版本是纯静态页面，可以直接部署到 Vercel。

## 本地预览

```sh
npm run dev
```

打开 `http://localhost:4173/`。

## 生成音频

当前页面会优先播放 `audio/` 目录里的 MP3 文件。音频已经生成好并可以直接部署。

如果以后新增单词或例句，可以先安装生成工具：

```sh
python3 -m pip install --target ./.python-packages -r requirements.txt
```

然后补齐缺失音频：

```sh
npm run audio
```

## 部署到 Vercel

1. 把这个文件夹推到 GitHub 仓库。
2. 在 Vercel 里选择该仓库。
3. Framework Preset 选择 `Other`。
4. Build Command 留空。
5. Output Directory 留空。
6. 点击 Deploy。

内容数据在 `data/scenes.published.json` 里，`app.js` 启动时读取已发布数据。

## 内容审核后台

当前内容数据已经拆到 `data/scenes.published.json`。本地审核后台使用文件模拟服务端存储：

```sh
npm run admin
```

打开 `http://localhost:4180/admin`。

内容流转：

- 草稿数据：`data/scenes.drafts.json`
- 发布数据：`data/scenes.published.json`
- 生成图片服务端存储：`server/uploads/`

`imagegen` 生成图片后，先把图片注册到服务端存储并写回草稿：

```sh
npm run register:image -- --scene zoo --word lion --source /path/to/lion.png --prompt "imagegen prompt"
```

审核后台点击“审核通过并发布”后，会校验单词、例句和图片状态，再把干净数据写入发布数据。App 只读取已发布数据。

## 线上内容服务

上线到 Vercel 后，内容 API 会使用 Vercel Blob 存储草稿和发布数据，不依赖本地可写文件。

需要在 Vercel 项目里配置环境变量：

```sh
CONTENT_BLOB_READ_WRITE_TOKEN=...
ADMIN_TOKEN=...
```

接口：

- App 读取已发布内容：`GET /api/scenes/published`
- 后台读取内容：`GET /api/content`
- 后台创建草稿：`POST /api/scenes/drafts`
- 后台保存草稿：`PUT /api/scenes/drafts/:id`
- 后台审核发布：`POST /api/scenes/drafts/:id/approve`

后台地址：

```text
https://你的域名/admin
```

首次打开后台会要求输入 `ADMIN_TOKEN`。

App 每次启动会优先请求服务器 `GET /api/scenes/published`，成功后写入本地缓存；网络失败时先使用本地缓存，再退回包内 `data/scenes.published.json`。

打包 Android 时可以指定真实内容服务域名：

```sh
CONTENT_API_BASE=https://你的域名 npm run cap:copy:release
```

如果要把 `imagegen` 生成的图片直接注册到线上草稿，使用同一个脚本并提供线上环境变量：

```sh
CONTENT_API_BASE=https://你的域名 \
ADMIN_TOKEN=... \
CONTENT_BLOB_READ_WRITE_TOKEN=... \
npm run register:image -- --scene zoo --word lion --source /path/to/lion.png --prompt "imagegen prompt"
```

## 打包 Android APK

当前项目可以继续作为 H5 使用，也可以用 Capacitor 打包成 Android APP。

H5 访问时 `window.APP_BUILD_TYPE` 默认是 `web`。Debug APK 会注入 `debug`，Release APK 会注入 `release`。

第一次准备 Android 工程：

```sh
npm run prepare:apk
npx cap add android
```

之后每次内容、样式或音频更新后：

```sh
npm run cap:copy
```

打开 Android Studio：

```sh
npm run cap:open
```

在 Android Studio 里选择 `Build > Build Bundle(s) / APK(s) > Build APK(s)`。

## 正式发布包

正式签名配置读取 `android/keystore.properties`，签名文件在 `android/keystores/little-english-release.jks`。这两个文件不会提交到仓库，务必单独备份；以后更新同一个 Android 应用必须继续使用同一个签名文件。

生成正式 APK 和 Google Play 使用的 AAB：

```sh
npm run build:release
```

构建产物位置：

- APK: `android/app/build/outputs/apk/release/app-release.apk`
- AAB: `android/app/build/outputs/bundle/release/app-release.aab`
