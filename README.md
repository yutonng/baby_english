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
