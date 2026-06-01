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

内容数据在 `app.js` 的 `scenes` 数组里。

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
