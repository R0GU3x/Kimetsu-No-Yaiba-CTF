# 鬼滅 CTF

<p align="center">
  <img src="/Server/snaps/stats.png" width="100%">
</p>

<p align="center">
  <img src="/Server/snaps/UI-1.png" width="48%">
  <img src="/Server/snaps/UI-2.png" width="48%">
</p>

<p align="center">
  <img src="/Server/snaps/UI-3.png" width="48%">
  <img src="/Server/snaps/UI-4.png" width="48%">
</p>

Welcome to **鬼滅 CTF**, a browser-based Capture The Flag experience inspired by **Kimetsu no Yaiba**.

<strong>Digital demons have emerged</strong>.

Your mission is to stay alive, solve the challenges, and save the world from the digital demons.

Good luck, Slayer.

<details>
<summary>🎮 Play the CTF</summary>

If you simply want to **play the CTF** and are **not hosting your own instance**, download the pre-configured package below.

**Download:**
https://drive.google.com/file/d/1IUiw0lPJlV-fGkCychUuXOLTfePpDwiD/view

**ZIP Password:**

```text
k!m3tsuN0y@iba
```

After extracting the archive, open **`index.html`** in your web browser and begin your journey.

---
</details>

<p align="center">

━━━━━━━━━━━━━━━━━━━━━━━━━

</p>

<details>
<summary>⚙️ Configure the CTF</summary>

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

</details>

<details>
<summary>🍷 Other Requirements</summary>

A <b>stable internet connection</b> is required because:

- Static assets are loaded online.
- The backend communicates through the Cloudflared tunnel.
- Player heartbeat monitoring requires uninterrupted connectivity.

---

</details>
