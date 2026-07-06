![A descriptive title](/Client/static/kny-s1-logo.png)

# 鬼滅 CTF — Kimetsu CTF

Welcome to **鬼滅 CTF**, a browser-based Capture The Flag experience inspired by **Kimetsu no Yaiba**.

## 🚀 Getting Started

### 1. Start the Backend Server

Launch the Flask backend by running:

```bash
python server.py
```

The server will start on:

```
http://127.0.0.1:5000
```

---

### 2. Expose the Server Online using Cloudflared

To allow players outside your local network to connect, expose the Flask server with Cloudflared.

Run:

```bash
cloudflared tunnel --url http://localhost:5000
```

After a few seconds, Cloudflared will display a public URL similar to:

```
https://random-name.trycloudflare.com
```

Copy this URL.

---

### 3. Configure `kny.json`

Open the `kny.json` configuration file and replace the backend URL with the Cloudflared URL.

Example:

```json
{
    "api": "https://random-name.trycloudflare.com"
}
```

Save the file.

The frontend will now communicate with the publicly accessible backend.

---

### 4. Launch the Game

Open **`index.html`** in your web browser.

No additional setup is required.

---

## 🌐 Internet Connection

A stable internet connection is required because:

- Static assets are loaded online.
- The backend communicates through the Cloudflared tunnel.
- Player heartbeat monitoring requires uninterrupted connectivity.

---

## 🎯 Mission

Digital demons have emerged.

Your mission is to stay alive, solve the challenges, and save the world from the digital demons.

Good luck, Slayer.

---

# GAMBARE GAMBARE !!! ⚔️🔥