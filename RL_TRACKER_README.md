# Ducky RL Tracker 0.2.0-live

Android APK for Switch-2-first Rocket League stat tracking.

- Connect with the Epic display name linked to the Switch / Switch 2 Rocket League account.
- Reads current Rocket League profile/rank data from Tracker Network's public profile endpoint.
- Shows ranked playlists, casual shared rating, tournaments, and rotating/extra playlists returned by the provider.
- Shows lifetime goals, shots, shooting ratio, saves, assists, wins, and MVPs when available.
- Saves local snapshots and calculates MMR gained, MMR lost, net movement, tracked games, and tracked win percentage.
- Uses Android JobScheduler for periodic network refreshes.

The data endpoint is unofficial/undocumented and may be rate-limited or changed. The app reports provider errors instead of substituting fake stats.
