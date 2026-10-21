# SmartShuffle signing and updates (v1.1 onward)

**Do not rotate or regenerate the signing certificate.** Android rejects package updates signed by another key. v1.0 was signed with an ephemeral build-time key that was not backed up and cannot be recovered from its APK.

## Stable signing identity for v1.1 and later

- Android package ID: `com.duckygem.smartshuffle`
- SHA-1: `5F:90:EE:13:83:31:78:55:F8:DD:6C:01:01:3C:C2:E1:47:62:60:D1`
- SHA-256: `24:2C:19:3A:BE:8B:48:BC:5D:72:5B:2B:98:04:BC:62:07:0C:79:93:22:0D:F3:3B:E0:CD:E1:AA:57:5A:C6:90`
- Keystore SHA-256: `3faa651577e9a537473a9ff31ac09a19f292f4bd0728b37bac5323ae6fd1e60f`
- Key alias: `AndroidDebugKey`
- GitHub Actions cache key: `smartshuffle-v11-debug-signing-2026-v1`
- GitHub Actions cache path: `~/.config/.android/debug.keystore` **not** `~/.android/debug.keystore` on this runner.

The `build-smartshuffle-v11.yml` cloud workflow **fails closed** if the cached keystore is missing or its hash differs. Never fall back to freshly generated debug keys.

## Private backup

An encrypted backup was retrieved from GitHub cache on 2026-10-21 using a public-key-encrypted, upload-artifact-only workflow. The keystore was decrypted and SHA-256 and certificate SHA-1 were verified locally. The encrypted user backup ZIP and a separately shared recovery code were delivered in the ChatGPT conversation. Do not put the private keystore or its recovery code into a public repository or unencrypted GitHub Actions artifacts.

If cache disappears, use the backup to restore the same keystore or sign APKs locally with the pure-Java Apache-licensed `com.android.tools.build:apksig` library. APK signing using restored key was successfully tested: v2 and v3 verification succeeded on the rebuilt v1.1 APK.

## Google OAuth and the one-time upgrade

The initial v1.0 key is lost. Android **cannot** install v1.1 over v1.0; a one-time uninstall/reinstall is unavoidable for the same package ID, unless the original v1.0 private signing key is found. A new Android OAuth client in Google Cloud must use the same package `com.duckygem.smartshuffle` and the v1.1 SHA-1 above. Keep v1.0 installed until the new OAuth client is prepared. Uninstalling v1.0 may erase locally saved artist genre labels and other preferences but does not delete remote YouTube Music playlists.

After v1.1 is installed, later APKs with a higher `versionCode`, the same package ID, and the same SHA-1 can normally be installed as in-place updates.
