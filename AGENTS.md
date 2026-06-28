# Project Notes

## Mobile Packaging

When packaging the Android app, always set the production content API base URL so the app can load newly published scenes from the server on startup:

```sh
CONTENT_API_BASE=https://babyeng.nihaoya.cloud npm run cap:copy:release
```

Without `CONTENT_API_BASE`, the packaged app will try to read `/api/scenes/published` from the app bundle/local origin and will not receive newly published server scenes.
