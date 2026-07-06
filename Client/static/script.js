/* ═══════════════════════════════════════════════════════
   KIMETSU CTF — MAIN SCRIPT
   Challenge data · State · Modal · Leaderboard · Canvas
═══════════════════════════════════════════════════════ */

/* ──────────────────────────────────────────
   SHA-256 FLAG VALIDATION UTILITY
   Flags are never stored in plaintext.
   Store: sha256("kny{actual_flag}") as flagHash.
──────────────────────────────────────────── */
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function validateFlag(candidate, storedHash) {
  const hash = await sha256(candidate);
  return hash === storedHash;
}

/* ──────────────────────────────────────────
   CHALLENGE DATA — single source of truth
   To add a challenge: add an entry here.
   flagHash = sha256("kny{flag_value}")
   introVideo: path under assets/movies/ (optional)
   outroVideo: path under assets/movies/ (optional) — plays via the
               same player after the challenge is solved correctly
   downloadableFiles: array of { name, path } (optional)
──────────────────────────────────────────── */
const CTF_DATA = {
  ranks: [
    {
      id: 'mizunoto',
      kanji: '壬',
      en: 'MIZUNOTO',
      chapter: 'One',
      breathing: 'Axe Breathing - Seventh Form',
      color: 'var(--water-bright)',
      bgImage: 'assets/a1/img2.png',
      bgKanji: '水',
      unlockRequirement: 0,
      requiredSolvesToUnlockNext: 2,
      challenges: [
        {
          id: 'a1',
          title: 'The Demon',
          points: 150,
          difficulty: 'easy',
          tag: 'Cryptography',
          author: 'Tanjiro',
          breathingStyle: 'Axe Breathing - Seventh Form',
          lore: 'Help Tanjiro breakout of the Demon\'s hold. Find the help he doesn\'t realize he has.',
          hint: 'Again and Again and Again. The answer favors persistence.',
          flagHash: '8d2a9ad18a646070738f0da022c3b6f2e18297e61b5cbe3d2e53fa73323513d6', // kimetsu{flag_one}
          introVideo: 'assets/a1/intro.mp4',
          outroVideo: 'assets/a1/outro.mp4',
          bgImage: 'assets/a1/img2.png',
          downloadableFiles: [
            { name: 'task.txt', path: 'assets/a1/task.txt' }
          ],
        },
        {
          id: 'a2',
          title: "Lost in the mountains",
          points: 200,
          difficulty: 'easy',
          tag: 'OSINT',
          author: 'Urokodaki',
          breathingStyle: 'Raw Breathing - First Form',
          lore: "Master Urokodaki challenges Tanjiro with a task of finding the Restaurant he had visited during one of his solo trips to eradicate demons. The password for <code>flag.pdf</code> is the website domain of the restaurant. \"Gambare Gambare !!!\"",
          hint: '"I found <b>task.png</b> from Urokodaki\'s book shelf. <br>Pani puri sounds so delicious. Sensei says he loved it"',
          flagHash: '8a7070fffb4be86cb1fc76f8d4382532154022ebc30c3680d10ca784c314b1cd', // kimetsu{flag_one},
          introVideo: 'assets/a2/intro.mp4',
          outroVideo: 'assets/a2/outro_updated.mp4',
          bgImage: 'assets/a2/img1.png',
          downloadableFiles: [
            { name: 'task.png', path: 'assets/a2/task.png' },
            { name: 'flag.pdf', path: 'assets/a2/flag.pdf' }
          ],
        },
        {
          id: 'a3',
          title: "The Final Test",
          points: 250,
          difficulty: 'easy',
          tag: 'Binary Exploitation',
          author: 'Urokodaki',
          breathingStyle: 'Raw Breathing - Tenth Form',
          lore: "Before he can become a true Demon Slayer, Tanjiro must overcome the giant boulder placed before him by Urokodaki. The flag is broken into 3 parts and scattered. Find and merge them to prove your skills to Urokodaki san.",
          hint: 'Poor Tanjiro is having a hard time figuring out how to slice the boulder.',
          flagHash: 'd5d773df54d2b36ff713cdc01006123f3cb7cd7aadf050440b4adbc9ca4bccd2', // kimetsu{flag_one},
          introVideo: 'assets/a3/intro.mp4',
          outroVideo: 'assets/a3/outro.mp4',
          bgImage: 'assets/a3/img1.png',
          downloadableFiles: [
            { name: 'task.apk', path: 'assets/a3/task.apk' }
          ],
        },
        {
          id: 'a4',
          title: 'The First Mission',
          points: 300,
          difficulty: 'medium',
          tag: 'Forensics',
          author: 'The Kamado Sibilings',
          breathingStyle: 'Water Breathing - Third Form',
          lore: 'Your first mission as SOC Analyst is to investigate the attack which took place in your client firm. You have been given a pcap file of the associated traffic. The password for <code>flag.pdf</code> is the username of the infected windows client. Good Lunk !!!',
          hint: 'CLIENT LAN INFORMATION <br><b>LAN segment range:</b>  10.1.17.0/24 <br><b>Domain:</b>  bluemoontuesday.com  <br><b>AD domain controller:</b>  10.1.17.2 - WIN-GSH54QLW48D ',
          flagHash: '8389c4da8674465b4f19f9ec2ffaeb166ec853b1d6d273abcc83d0c64ef8987f', // kimetsu{flag_one},
          introVideo: 'assets/a4/intro.mp4',
          outroVideo: 'assets/a4/outro.mp4',
          bgImage: 'assets/a4/img2.png',
          downloadableFiles: [
            { name: 'task.zip', path: 'assets/a4/task.zip' },
            { name: 'flag.pdf', path: 'assets/a4/flag.pdf' }
          ],
        },
        {
          id: 'a5',
          title: "The Demon King",
          points: 350,
          difficulty: 'hard',
          tag: 'Web Exploitation',
          author: 'Muzan',
          breathingStyle: 'Water Breathing - Second Form',
          lore: "Find MUZAN. <br>Access the machine to get the <code>instance_ip</code>. <br><b>Port:</b> <code>3005<code>",
          hint: "Tanjiro seeks something he isn't supposed to.",
          flagHash: '0ee3f44669633d702b2b9bc1826fe479ced62569cb1de432b0d27e946e63ffc9', // kimetsu{flag_one},
          introVideo: 'assets/a5/intro.mp4',
          outroVideo: 'assets/a5/outro.mp4',
          bgImage: 'assets/a5/img.png',
          downloadableFiles: [],
        }
      ]
    },
    {
      id: 'tsuchinoto',
      kanji: '己',
      en: 'TSUCHINOTO',
      chapter: 'Two',
      breathing: 'Thunder Breathing',
      color: 'var(--violet-bright)',
      bgImage: 'assets/images/tsuchinoto.jpg',
      bgKanji: '雷',
      unlockRequirement: 2,
      requiredSolvesToUnlockNext: 3,
      challenges: [
        {
          id: 'b1',
          title: "The Wrong Direction",
          points: 250,
          difficulty: 'medium',
          tag: 'Binary Exploitation',
          author: 'Yahaba',
          breathingStyle: 'Water Breathing - Second Form',
          lore: 'The arrows Yahaba uses to control his victims are not as simple as they seem. Find the right password to unlock the binary. The password for <code>flag.pdf</code> is the only right password accepted by the binary.',
          hint: 'Plain attacks won\'t work. IMPROVISE !!!',
          flagHash: '47cc00869ec70d05d3ef5085dd4975a6ed7efffc236aaf287b8e6f681c6a305e', // kimetsu{flag_one},
          introVideo: 'assets/b1/intro.mp4',
          outroVideo: 'assets/b1/outro.mp4',
          bgImage: 'assets/b1/img.png',
          downloadableFiles: [
            { name: 'task.zip', path: 'assets/b1/task.zip' },
            { name: 'flag.pdf', path: 'assets/b1/flag.pdf' }
          ],
        },
        {
          id: 'b2',
          title: "Strike with Nezuko",
          points: 200,
          difficulty: 'easy',
          tag: 'Miscellaneous',
          author: 'Nezuko',
          breathingStyle: 'Demon Kick - Fourth Form',
          lore: 'Nezuko shocks her opponent with her powerful kicks. Help nezuko maintain her pace by kicking the right spots till the demon tires out. <br>Access the machine to get the <code>instance_ip</code>. <br><b>Port:</b> <code>4002<code>',
          hint: 'One kick at a time Nezuko !!!!',
          flagHash: '90739fc94a43ea925e8638f4b7f2d0dde0d4be123f9cbfccb62ebe745b087264', // kimetsu{flag_one},
          introVideo: 'assets/b2/intro.mp4',
          outroVideo: 'assets/b2/outro.mp4',
          bgImage: 'assets/b2/img.png',
          downloadableFiles: [],
        },
        {
          id: 'b3',
          title: "The Cry Baby",
          points: 300,
          difficulty: 'medium',
          tag: 'Web Exploitation',
          author: 'Zenitsu',
          breathingStyle: 'Thunder Breathing - First Form',
          lore: 'Help Zenitsu obtain <code>admin</code> access of the web app and save the kids from the demon\'s clutches. <br>Access the machine to get the <code>instance_ip</code>. <br><b>Port:</b> <code>4003<code>',
          hint: '<b>Zenitsu</b>: <i>"I remember my master creating the secret key from his first name and a two-digit number. One thing I\'m sure of: the name started with a capital letter. I even heard the Caps Lock key being pressed."</i>',
          flagHash: '3cfa2bf1c5faa6de572d20b47fc5124f487164680bcb517d637039d2945ba09c', // kimetsu{flag_one},
          introVideo: 'assets/b3/intro.mp4',
          outroVideo: 'assets/b3/outro.mp4',
          bgImage: 'assets/b3/img.png',
          downloadableFiles: [],
        },
        {
          id: 'b4',
          title: 'Kyogai\'s Drum Game',
          points: 350,
          difficulty: 'medium',
          tag: 'Cryptography',
          author: 'Kyogai',
          breathingStyle: 'Blood Demon Art — Tsuzumi Mansion',
          lore: 'Decode the Flag: <br><code>ORC{l@vh_a0vo_5l@pp_t3vw!wx}<code>',
          hint: 'The Kyogai\'s beats grew stronger — each strike shifting reality by 2, then 4, then 6... <br>Tanjiro will have to twist in the opposite direction to cancel out the demon\'s rotational force',
          flagHash: '7200fabcda6cef681f0e6124201f95328c9c505e67fdecda03e318f6380e8a52', // kimetsu{flag_one},
          introVideo: 'assets/b4/intro.mp4',
          outroVideo: 'assets/b4/outro.mp4',
          bgImage: 'assets/b4/img.png',
          downloadableFiles: [],
        }
      ]
    },
    {
      id: 'kinoe',
      kanji: '甲',
      en: 'KINOE',
      chapter: 'Three',
      breathing: 'Sound Breathing',
      color: 'var(--gold-bright)',
      bgImage: 'assets/images/hinoto.jpg',
      bgKanji: '音',
      unlockRequirement: 2,
      requiredSolvesToUnlockNext: 3,
      challenges: [
        {
          id: 'c1',
          title: "Lord Inosuke",
          points: 500,
          difficulty: 'hard',
          tag: 'OSINT',
          author: 'Inosuke',
          breathingStyle: 'Boar Breathing - First Form',
          lore: 'Zenitsu recently visited a restaurant in Japan but refuses to tell Inosuke its name. Help Inosuke identify the restaurant. <b>Username: </b><code>hinosuke245</code> <h3>Flag Format</h3><code>KNY{firstname_lastname}</code></p> <h3>Example</h3> If the restaurant\'s name is <code>Tasty Snacks</code> <br>then the flag would be <code>KNY{tasty_snacks}</code>',
          hint: 'Nothing\'s here',
          flagHash: '9b8deb879d82ff87478c36602e3be21f2dfd98e18637b90cbb41b81d9799777b', // kimetsu{flag_one},
          introVideo: 'assets/c1/intro.mp4',
          outroVideo: 'assets/c1/outro.mp4',
          bgImage: 'assets/c1/img.png',
          downloadableFiles: [],
        },
        {
          id: 'c2',
          title: "Lord Inosuke II",
          points: 350,
          difficulty: 'hard',
          tag: 'Cryptography',
          author: 'Inosuke',
          breathingStyle: 'Boar Breathing - Sixth Form',
          lore: 'Can you find the flag and help Inosuke unleash his breathing technique?',
          hint: 'The cook changed, and so did the taste of the dish. But the recipe remains the same.',
          flagHash: '73b2b26d003a88ddfd86922c295aa131026912b5272453f1e96568dc7d1c7e49', // kimetsu{flag_one},
          introVideo: 'assets/c2/intro.mp4',
          outroVideo: 'assets/c2/outro.mp4',
          bgImage: 'assets/c2/img.png',
          downloadableFiles: [
            { name: 'encrypt.py', path: 'assets/c2/encrypt.py' },
            { name: 'ct_values.txt', path: 'assets/c2/ct_values.txt' }
          ],
        },
        {
          id: 'c3',
          title: "Zenitsu's Love",
          points: 300,
          difficulty: 'easy',
          tag: 'Stegnography',
          author: 'Zenitsu',
          breathingStyle: 'Thunder Breathing - First Form',
          lore: 'Find the hidden flag in the photo and watch Zenitsu turn the table upside down.',
          hint: 'Sometimes I wish I could be color blind',
          flagHash: '0e54873c044f3803d4947d78ca89c02bba20b4a55f22343b67c0440cea3b3dc2', // kimetsu{flag_one},
          introVideo: 'assets/c3/intro.mp4',
          outroVideo: 'assets/c3/outro.mp4',
          bgImage: 'assets/c3/img.png',
          downloadableFiles: [
            { name: 'the_love_story.png', path: 'assets/c3/the_love_story.png' }
          ],
        },
        {
          id: 'c4',
          title: "Dead Calm",
          points: 300,
          difficulty: 'medium',
          tag: 'Forensics',
          author: 'Giyu',
          breathingStyle: 'Water Breathing — Sixth Form',
          lore: 'The demon has compromised inosuke\'s server. During the investigation, you discover they overwrote a <code>.local</code> file. The password to <code>flag.pdf</code> is the absolute path of that <code>.local</code> file.',
          hint: 'My usual sword is worn out. Can I please get another one?',
          flagHash: '615c235a346c994eb81fb48da0bd715c79339603d13a281bf34f64dab4d58637', // kimetsu{flag_one},
          introVideo: 'assets/c4/intro.mp4',
          outroVideo: 'assets/c4/outro.mp4',
          bgImage: 'assets/c4/img.png',
          downloadableFiles: [
            { name: 'task.pcap', path: 'assets/c4/task.pcap' },
            { name: 'flag.pdf', path: 'assets/c4/flag.pdf' }
          ],
        },
        {
          id: 'c5',
          title: "The Siblings Bond",
          points: 350,
          difficulty: 'hard',
          tag: 'Cryptography',
          author: 'Nezuko',
          breathingStyle: 'Hinokami Kagura — Enbu',
          lore: 'He can\'t stop now and neither can you. Use the <b>hints</b> and apply all the force you\'ve got to defeat the demon.',
          hint: '<h3>Password Hints</h3><b>Length:</b> 6<br><b>First 5 characters:</b> [a-z][0-9]<br><b>Last character:</b> symbol',
          flagHash: '99b8c523237bb5c4539dc08a4e7119c9b39c3e99cdf1eea45320436e7df24582', // kimetsu{flag_one},
          introVideo: 'assets/c5/intro.mp4',
          outroVideo: 'assets/c5/outro.mp4',
          bgImage: 'assets/c5/img.png',
          downloadableFiles: [
            { name: 'flag.pdf', path: 'assets/c5/flag.pdf' }
          ],
        },
        {
          id: 'c6',
          title: "Shinobu\'s Wrath",
          points: 150,
          difficulty: 'easy',
          tag: 'Binary Exploitation',
          author: 'Shinobu',
          breathingStyle: 'Insect Breathing — Fourth Form',
          lore: 'Beyond the vessel\'s edge rests a divine integer, known only to the ancient texts. They reveal but one clue: the exact number of characters a mortal must speak to awaken its power. Those who succeed may rewrite reality. <br><br>What is this number <i>(written in words)</i>? <br>If it were <b>1020</b>, the password for <code>flag.pdf</code> would be <code>one_thousand_twenty</code>.',          hint: 'Shinobu is a professional. She chooses the right type and amount for poisons.',
          flagHash: '90c5f02399e8eb511b9c92b24e2b4b07a02eae1b1d37cfb88eee88e755395a57', // kimetsu{flag_one},
          introVideo: 'assets/c6/intro.mp4',
          outroVideo: 'assets/c6/outro.mp4',
          bgImage: 'assets/c6/img.png',
          downloadableFiles: [
            { name: 'task.zip', path: 'assets/c6/task.zip' },
            { name: 'flag.pdf', path: 'assets/c6/flag.pdf' }
          ],
        },
      ]
    },
    {
      id: 'hashira',
      kanji: '柱',
      en: 'HASHIRA - BONUS CHALLENGE',
      chapter: 'Four',
      breathing: 'Flame Breathing',
      color: 'var(--blood-bright)',
      bgImage: 'assets/images/kinoto.jpg',
      bgKanji: '炎',
      unlockRequirement: 3,
      requiredSolvesToUnlockNext: 3,
      challenges: [
        {
          id: 'd1',
          title: "The Hashiras",
          points: 700,
          difficulty: 'hard',
          tag: 'Boot2Root',
          author: 'Kagaya Ubuyashiki',
          breathingStyle: 'Flame Breathing — Ninth Form',
          lore: 'Pwn the machine and obtain the flag from <code>/root/flag.txt</code>',
          hint: 'Sometimes, too much is indeed too much. It leaks.',
          flagHash: 'cd8df0a9895c044eb3fbb850d4cff177b0a1535403c7eebec670e7e6ecdc5e30', // kimetsu{flag_one},
          introVideo: 'assets/d1/intro.mp4',
          bgImage: 'assets/d1/img.png',
          downloadableFiles: [],
        }
      ]
    },
  ]
};

/* ──────────────────────────────────────────
   STATE MANAGEMENT
──────────────────────────────────────────── */
const UNLOCK_STORAGE_KEY = 'kimetsu_unlocked_categories';

/* Compute score from solved challenge IDs as the single source of truth.
   Prevents the cached kimetsu_score from ever drifting out of sync with
   the actual solved set (e.g. after a partial-reset or data corruption). */
function computeScoreFromSolvedIds(solvedIds) {
  const allChallenges = CTF_DATA.ranks.flatMap(r => r.challenges);
  return [...solvedIds].reduce((sum, id) => {
    const ch = allChallenges.find(c => c.id === id);
    return sum + (ch ? ch.points : 0);
  }, 0);
}

const _savedSolved = new Set(JSON.parse(localStorage.getItem('kimetsu_solved') || '[]'));
const state = {
  solvedChallenges: _savedSolved,
  totalScore:       computeScoreFromSolvedIds(_savedSolved),
  activeChallenge:  null,
};

function countSolvesInCategory(rank) {
  return rank.challenges.filter(ch => state.solvedChallenges.has(ch.id)).length;
}

function computeUnlockedCategoryIds() {
  const unlocked = new Set();
  CTF_DATA.ranks.forEach((rank, idx) => {
    if (idx === 0) {
      unlocked.add(rank.id);
      return;
    }
    const prevRank = CTF_DATA.ranks[idx - 1];
    if (countSolvesInCategory(prevRank) >= rank.unlockRequirement) {
      unlocked.add(rank.id);
    }
  });
  return unlocked;
}

function isCategoryUnlocked(rankId) {
  return computeUnlockedCategoryIds().has(rankId);
}

function persistUnlockedCategories() {
  const ids = [...computeUnlockedCategoryIds()];
  localStorage.setItem(UNLOCK_STORAGE_KEY, JSON.stringify(ids));
  return ids;
}

function getUnlockProgress(rank, rankIndex) {
  if (rankIndex === 0) return { solved: 0, required: 0 };
  const prevRank = CTF_DATA.ranks[rankIndex - 1];
  return {
    solved: countSolvesInCategory(prevRank),
    required: rank.unlockRequirement,
  };
}

/* Display label for a rank's chapter, e.g. "Chapter One" */
function getChapterLabel(rank) {
  return `Chapter ${rank.chapter}`;
}

window._kimetsuIsCategoryUnlocked = isCategoryUnlocked;

/* Expose reset for auth logout */
window.KimetsuState = {
  reset() {
    state.solvedChallenges.clear();
    state.totalScore = 0;
    localStorage.removeItem('kimetsu_solved');
    localStorage.removeItem('kimetsu_score');
    localStorage.removeItem(UNLOCK_STORAGE_KEY);
    updateScoreDisplays();
    refreshChallengeUI();
  }
};

function saveSolve(id, points) {
  if (state.solvedChallenges.has(id)) return; // guard: already solved
  state.solvedChallenges.add(id);
  /* Recompute total from solved set — prevents any incremental drift */
  state.totalScore = computeScoreFromSolvedIds(state.solvedChallenges);
  localStorage.setItem('kimetsu_solved', JSON.stringify([...state.solvedChallenges]));
  localStorage.setItem('kimetsu_score',  String(state.totalScore));
  persistUnlockedCategories();
  updateScoreDisplays();
  refreshChallengeUI();
}

function requestChallenge(rank, ch) {
  if (!isCategoryUnlocked(rank.id)) return;
  window._kimetsuOpenChallenge(rank, ch);
}

/* ──────────────────────────────────────────
   HERO STATS — derived from CTF_DATA + state
   All values below are computed fresh on every
   call rather than cached, so they can never
   drift from the source of truth (CTF_DATA and
   the `state` object). Computation is O(n) over
   challenges/ranks, which is trivially cheap at
   this data size, so no memoization is needed.
──────────────────────────────────────────── */
function getAllChallenges() {
  return CTF_DATA.ranks.flatMap(rank => rank.challenges);
}

function getTotalChallengeCount() {
  return getAllChallenges().length;
}

function getMaxPossiblePoints() {
  return getAllChallenges().reduce((sum, ch) => sum + ch.points, 0);
}

function getUnlockedChapterCount() {
  return computeUnlockedCategoryIds().size;
}

function getTotalChapterCount() {
  return CTF_DATA.ranks.length;
}

function getCompletionPercent() {
  const total = getTotalChallengeCount();
  if (total === 0) return 0;
  return Math.round((state.solvedChallenges.size / total) * 100);
}

function updateScoreDisplays() {
  const scoreEl  = document.getElementById('nav-score-value');
  const solvesEl = document.getElementById('hero-solves');
  if (scoreEl)  scoreEl.textContent  = state.totalScore.toLocaleString();
  if (solvesEl) solvesEl.textContent = state.solvedChallenges.size;

  /* Hero stats block — fully dynamic, recomputed every call so it
     always reflects current CTF_DATA + saved progress with no reload
     required. Each element is looked up defensively in case the
     markup is ever trimmed down. */
  const totalChEl    = document.getElementById('hero-total-challenges');
  const chaptersEl    = document.getElementById('hero-chapters-unlocked');
  const maxPointsEl   = document.getElementById('hero-max-points');
  const completionEl  = document.getElementById('hero-completion');

  if (totalChEl)   totalChEl.textContent   = getTotalChallengeCount();
  if (chaptersEl)  chaptersEl.textContent  = `${getUnlockedChapterCount()}/${getTotalChapterCount()}`;
  if (maxPointsEl) maxPointsEl.textContent = getMaxPossiblePoints().toLocaleString();
  if (completionEl) completionEl.textContent = `${getCompletionPercent()}%`;
}

function updateSolvedCards() {
  document.querySelectorAll('.challenge-card').forEach(card => {
    const id = card.getAttribute('data-id');
    card.classList.toggle('solved', state.solvedChallenges.has(id));
  });
}

/* ──────────────────────────────────────────
   DOM BUILDER — Category sections with unlock gates
──────────────────────────────────────────── */
function buildRoster() {
  const container = document.getElementById('challenges-container');
  if (!container) return;
  container.innerHTML = '';

  CTF_DATA.ranks.forEach((rank, rankIndex) => {
    const unlocked = isCategoryUnlocked(rank.id);
    const section = document.createElement('section');
    section.className = 'category-section' + (unlocked ? '' : ' category-locked');
    section.id = 'cat-' + rank.id;
    section.setAttribute('data-category', rank.id);

    if (!unlocked) {
      const progress = getUnlockProgress(rank, rankIndex);
      const shellCount = Math.min(rank.challenges.length, 4);
      const shells = Array.from({ length: shellCount }, () =>
        '<div class="challenge-card challenge-card-locked" aria-hidden="true"><span class="card-lock-icon">🔒</span></div>'
      ).join('');

      section.innerHTML = `
        <div class="category-lock-panel">
          <div class="category-lock-icon" aria-hidden="true">🔒</div>
          <div class="category-lock-name">${getChapterLabel(rank)}</div>
          <div class="unlock-progress">Solved: ${progress.solved} / Required: ${progress.required}</div>
          <div class="locked-cards-shell">${shells}</div>
        </div>
      `;
      container.appendChild(section);
      return;
    }

    section.innerHTML = `
      <div class="category-header">
        <span class="category-kanji">${rank.kanji}</span>
        <div class="category-title-block">
          <div class="category-en">${rank.en}</div>
          <div class="category-label">${getChapterLabel(rank)} — ${rank.challenges.length} Challenges</div>
        </div>
      </div>
      <div class="cards-row" id="row-${rank.id}"></div>
    `;

    const row = section.querySelector('.cards-row');
    rank.challenges.forEach(ch => {
      const card = document.createElement('div');
      card.className = 'challenge-card' + (state.solvedChallenges.has(ch.id) ? ' solved' : '');
      card.setAttribute('data-id', ch.id);
      card.setAttribute('data-rank-id', rank.id);
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `${ch.title} — ${ch.points} points`);

      const diffClass = { easy: 'difficulty-easy', medium: 'difficulty-medium', hard: 'difficulty-hard', insane: 'difficulty-insane' }[ch.difficulty] || '';

      card.innerHTML = `
        <div class="card-jp-accent">${rank.bgKanji}</div>
        <div class="card-points">${ch.points}</div>
        <div class="card-title">${ch.title}</div>
        <div class="card-tag">${ch.tag}</div>
        <div class="card-difficulty ${diffClass}"></div>
      `;

      card.addEventListener('click',   () => requestChallenge(rank, ch));
      card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') requestChallenge(rank, ch); });

      row.appendChild(card);
    });

    container.appendChild(section);
  });
}

function refreshChallengeUI() {
  buildRoster();
  buildRankNav();
  bindChallengeCardHover();
}

/* ──────────────────────────────────────────
   CATEGORY QUICK-NAV — sticky, jumps to section
──────────────────────────────────────────── */
function buildRankNav() {
  const wrapper = document.getElementById('challenges-wrapper');
  if (!wrapper) return;

  const existing = document.getElementById('category-quicknav');
  if (existing) existing.remove();

  const nav = document.createElement('div');
  nav.id = 'category-quicknav';

  CTF_DATA.ranks.forEach(rank => {
    const unlocked = isCategoryUnlocked(rank.id);
    const btn = document.createElement('button');
    btn.className = 'rank-nav-btn' + (unlocked ? '' : ' is-locked');
    btn.textContent = unlocked ? getChapterLabel(rank) : `🔒 ${getChapterLabel(rank)}`;
    btn.setAttribute('data-cat', rank.id);
    btn.disabled = !unlocked;
    if (unlocked) {
      btn.addEventListener('click', () => {
        const target = document.getElementById('cat-' + rank.id);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
    nav.appendChild(btn);
  });

  wrapper.insertBefore(nav, wrapper.firstChild);

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('data-category');
        nav.querySelectorAll('.rank-nav-btn').forEach(b => {
          b.classList.toggle('is-active', b.getAttribute('data-cat') === id);
        });
      }
    });
  }, { rootMargin: '-20% 0px -70% 0px' });

  document.querySelectorAll('.category-section').forEach(s => observer.observe(s));
}

/* ──────────────────────────────────────────
   DOWNLOAD FILES COMPONENT
──────────────────────────────────────────── */
function buildDownloadsSection(files) {
  if (!files || files.length === 0) return null;

  const section = document.createElement('div');
  section.className = 'downloads-section';
  section.innerHTML = `
    <div class="downloads-label">
      <span class="downloads-icon">⬇</span>
      MISSION ASSETS
    </div>
    <div class="downloads-list"></div>
  `;

  const list = section.querySelector('.downloads-list');
  files.forEach(file => {
    const btn = document.createElement('a');
    btn.className = 'download-btn';
    btn.href      = file.path;
    btn.download  = file.name;
    /* Open task files in a new tab so the challenge view stays open,
       using secure link handling (no window.opener access). */
    btn.target = '_blank';
    btn.rel    = 'noopener noreferrer';
    btn.setAttribute('aria-label', `Download ${file.name}`);
    btn.innerHTML = `<span class="dl-icon">◈</span><span class="dl-name">${file.name}</span>`;
    list.appendChild(btn);
  });

  return section;
}

/* ──────────────────────────────────────────
   MODAL MEDIA BACKGROUND
   Loads .modal-media-bg image for the currently
   opened task from its `bgImage` property
   (falls back to the chapter's bgImage, then to
   a default styled placeholder). Supports
   png/jpg/jpeg/webp/gif — GIFs animate natively
   via CSS background-image, no canvas/video
   conversion involved.
──────────────────────────────────────────── */
const MODAL_BG_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp'];

function setModalMediaBg(bgPath) {
  const el = document.getElementById('modal-media-bg');
  if (!el) return;

  /* Clear any previous background while we resolve the new one */
  el.style.backgroundImage = 'none';
  el.classList.remove('media-bg-missing');

  if (!bgPath) {
    el.classList.add('media-bg-missing');
    return;
  }

  /* If the path already has a recognized image extension, use it as-is.
     Otherwise (e.g. an extension-less base name like 'assets/images/one'),
     try each supported extension in order until one loads. */
  const hasExt = MODAL_BG_EXTENSIONS.some(ext => bgPath.toLowerCase().endsWith('.' + ext));

  if (hasExt) {
    applyModalBgWithFallback(el, [bgPath]);
  } else {
    const candidates = MODAL_BG_EXTENSIONS.map(ext => `${bgPath}.${ext}`);
    applyModalBgWithFallback(el, candidates);
  }
}

/* Try each candidate URL in order; first one that successfully loads
   becomes the background-image. If none load, mark as missing. */
function applyModalBgWithFallback(el, candidates, idx = 0) {
  if (idx >= candidates.length) {
    el.style.backgroundImage = 'none';
    el.classList.add('media-bg-missing');
    console.warn('[modal-media-bg] No valid asset found among:', candidates);
    return;
  }

  const url = candidates[idx];
  const probe = new Image();
  probe.onload = () => {
    el.style.backgroundImage = `url('${url}')`;
    el.classList.remove('media-bg-missing');
  };
  probe.onerror = () => applyModalBgWithFallback(el, candidates, idx + 1);
  probe.src = url;
}

/* ──────────────────────────────────────────
   HTML SANITIZER — safe innerHTML rendering
   Allows standard formatting tags (b, i, em,
   strong, u, br, p, ul, ol, li, pre, code,
   a, span) while stripping scripts, event
   handlers, iframes, and all other dangerous
   content. Used for lore and hint fields.
──────────────────────────────────────────── */
const ALLOWED_TAGS = new Set([
  'b', 'strong', 'i', 'em', 'u', 's', 'br', 'p',
  'ul', 'ol', 'li', 'pre', 'code', 'span', 'a',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
]);
const ALLOWED_ATTRS = {
  'a':    ['href', 'target', 'rel'],
  'span': ['class', 'style'],
  'code': ['class'],
  'pre':  ['class'],
};

function sanitizeHTML(raw) {
  if (!raw) return '';
  // Parse into a detached document so no scripts execute
  const doc = new DOMParser().parseFromString(
    `<body>${raw}</body>`, 'text/html'
  );
  sanitizeNode(doc.body);
  return doc.body.innerHTML;
}

function sanitizeNode(node) {
  const children = [...node.childNodes];
  for (const child of children) {
    if (child.nodeType === Node.TEXT_NODE) continue;
    if (child.nodeType !== Node.ELEMENT_NODE) {
      child.remove();
      continue;
    }
    const tag = child.tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) {
      // Replace disallowed element with its text content
      const text = document.createTextNode(child.textContent);
      child.replaceWith(text);
      continue;
    }
    // Strip all attributes then restore allowed ones
    const allowedForTag = ALLOWED_ATTRS[tag] || [];
    const attrNames = [...child.attributes].map(a => a.name);
    for (const attr of attrNames) {
      if (!allowedForTag.includes(attr)) {
        child.removeAttribute(attr);
      }
    }
    // Force safe values on <a> tags
    if (tag === 'a') {
      const href = child.getAttribute('href') || '';
      if (/^javascript:/i.test(href.trim())) child.removeAttribute('href');
      child.setAttribute('target', '_blank');
      child.setAttribute('rel', 'noopener noreferrer');
    }
    // Remove inline event handlers from style that might be dangerous
    // Recurse into children
    sanitizeNode(child);
  }
}

/* ──────────────────────────────────────────
   MODAL SYSTEM — The Demon Inquisition
──────────────────────────────────────────── */
function openChallenge(rank, ch) {
  if (!isCategoryUnlocked(rank.id)) return;

  state.activeChallenge = ch;

  document.getElementById('modal-title').textContent        = ch.title;
  document.getElementById('modal-points').textContent       = ch.points;
  document.getElementById('modal-lore').innerHTML           = sanitizeHTML(ch.lore);
  document.getElementById('modal-category').textContent     = getChapterLabel(rank);
  document.getElementById('modal-difficulty').textContent   = ch.difficulty.toUpperCase();
  document.getElementById('modal-author').textContent       = ch.author;
  document.getElementById('modal-tag').textContent            = ch.tag;
  document.getElementById('modal-breathing').textContent    = ch.breathingStyle;
  document.getElementById('modal-kanji-bg').textContent     = rank.bgKanji;
  document.getElementById('hint-text').innerHTML            = sanitizeHTML(ch.hint);

  const statusEl = document.getElementById('modal-status');
  if (state.solvedChallenges.has(ch.id)) {
    statusEl.textContent  = '✓ SOLVED';
    statusEl.style.color  = 'var(--jade-bright)';
  } else {
    statusEl.textContent  = 'UNSOLVED';
    statusEl.style.color  = 'var(--white-dim)';
  }

  /* Per-task background — falls back to the chapter's bgImage if the
     task doesn't define its own, then to the default "missing" styling
     handled inside setModalMediaBg(). */
  setModalMediaBg(ch.bgImage || rank.bgImage);

  document.getElementById('flag-input').value = '';
  const fb = document.getElementById('flag-feedback');
  fb.textContent = '';
  fb.className = 'flag-feedback';

  const hintContent = document.getElementById('hint-content');
  const hintToggle  = document.getElementById('hint-toggle');
  hintContent.classList.remove('open');
  hintToggle.classList.remove('open');

  /* Downloadable files — rebuild each open */
  const existingDl = document.getElementById('modal-downloads');
  if (existingDl) existingDl.remove();
  const dlSection = buildDownloadsSection(ch.downloadableFiles);
  if (dlSection) {
    dlSection.id = 'modal-downloads';
    const flagArea = document.getElementById('flag-submit-area');
    flagArea.parentNode.insertBefore(dlSection, flagArea);
  }

  const overlay = document.getElementById('modal-overlay');
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';

  gsap.fromTo('#modal-container', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'expo.out' });
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  gsap.to('#modal-container', {
    y: 30, opacity: 0, duration: 0.3, ease: 'expo.in',
    onComplete: () => {
      if (typeof window._kimetsuCloseModal === 'function') {
        window._kimetsuCloseModal();
      }
      overlay.classList.remove('active');
      document.body.style.overflow = '';
      state.activeChallenge = null;
    }
  });
}

/* Video system hooks — video.js wraps openChallenge for local intro playback */
window._kimetsuOpenChallenge = openChallenge;
window._kimetsuCloseModal    = function () {};

document.getElementById('modal-close-btn').addEventListener('click', closeModal);
document.getElementById('modal-backdrop').addEventListener('click', closeModal);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.getElementById('modal-overlay').classList.contains('active')) {
    closeModal();
  }
});

/* ──────────────────────────────────────────
   HINT TOGGLE
──────────────────────────────────────────── */
document.getElementById('hint-toggle').addEventListener('click', function () {
  const content = document.getElementById('hint-content');
  const isOpen  = content.classList.contains('open');
  this.classList.toggle('open', !isOpen);
  content.classList.toggle('open', !isOpen);
});

/* ──────────────────────────────────────────
   FLAG SUBMISSION — SHA-256 validated
──────────────────────────────────────────── */
document.getElementById('flag-submit-btn').addEventListener('click', submitFlag);
document.getElementById('flag-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') submitFlag();
});

async function submitFlag() {
  if (!state.activeChallenge) return;

  const input = document.getElementById('flag-input').value.trim();
  const ch    = state.activeChallenge;
  const fb    = document.getElementById('flag-feedback');
  const btn   = document.getElementById('flag-submit-btn');

  if (!input) {
    fb.textContent = '⚠ Enter a flag to submit.';
    fb.className = 'flag-feedback incorrect';
    return;
  }

  if (state.solvedChallenges.has(ch.id)) {
    fb.textContent = '◈ Already solved — flag previously accepted.';
    fb.className = 'flag-feedback already';
    return;
  }

  btn.disabled = true;
  triggerSlashFlash();

  const correct = await validateFlag(input, ch.flagHash);

  setTimeout(() => {
    if (correct) {
      fb.textContent = `✓ CORRECT — ${ch.points} points earned. Well done, demon slayer.`;
      fb.className = 'flag-feedback correct';
      saveSolve(ch.id, ch.points);
      document.getElementById('modal-status').textContent  = '✓ SOLVED';
      document.getElementById('modal-status').style.color  = 'var(--jade-bright)';
      gsap.fromTo(fb, { scale: 1.05 }, { scale: 1, duration: 0.4, ease: 'elastic.out(1, 0.5)' });

      /* Notify video system — plays outro/completion video (if configured)
         using the same player component as the intro video. */
      document.dispatchEvent(new CustomEvent('kimetsu:challengeSolved', { detail: { challenge: ch } }));
    } else {
      fb.textContent = '✕ INCORRECT — Wrong flag. The demon still breathes. Try again.';
      fb.className = 'flag-feedback incorrect';
      gsap.fromTo('#flag-input', { x: -8 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)', clearProps: 'x' });
    }
    btn.disabled = false;
  }, 520);
}

function triggerSlashFlash() {
  const flash = document.getElementById('slash-flash');
  gsap.timeline()
    .set(flash, { opacity: 1 })
    .to(flash,  { opacity: 0.85, duration: 0.04 })
    .to(flash,  { opacity: 0,    duration: 0.35, ease: 'expo.out' });
}

/* ──────────────────────────────────────────
   CURSOR — native browser cursor used
──────────────────────────────────────────── */
function initCursor() {
  /* Custom cursor removed for performance. Native cursor used. */
}

/* ──────────────────────────────────────────
   ATMOSPHERIC CANVAS — Optimized
   - Capped at 24 FPS
   - Pauses when tab hidden
   - Reduced particle count (20)
   - No radial gradients (flat fills)
   - Static ink strokes drawn once
   - No mouse influence on embers
──────────────────────────────────────────── */
function initCanvas() {
  const canvas = document.getElementById('atmos-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W = window.innerWidth, H = window.innerHeight;
  canvas.width = W; canvas.height = H;

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W; canvas.height = H;
      drawStaticStrokes();
    }, 200);
  }, { passive: true });

  const rr = (min, max) => Math.random() * (max - min) + min;

  /* Static ink strokes — drawn once to offscreen canvas */
  const strokeCanvas = document.createElement('canvas');
  strokeCanvas.width = W; strokeCanvas.height = H;
  const sCtx = strokeCanvas.getContext('2d');

  function drawStaticStrokes() {
    strokeCanvas.width = W; strokeCanvas.height = H;
    for (let i = 0; i < 10; i++) {
      sCtx.globalAlpha = rr(0.03, 0.09);
      sCtx.strokeStyle = '#c8922a';
      sCtx.lineWidth   = rr(0.5, 2);
      sCtx.lineCap     = 'round';
      sCtx.beginPath();
      sCtx.moveTo(rr(0, W), rr(0, H));
      sCtx.lineTo(rr(0, W), rr(0, H));
      sCtx.stroke();
    }
  }
  drawStaticStrokes();

  /* Embers — reduced count, flat fills */
  const EMBER_COUNT = 20;
  const embers = Array.from({ length: EMBER_COUNT }, () => ({
    x: rr(0, W), y: rr(0, H), r: rr(1, 2.5),
    vx: rr(-0.3, 0.3), vy: rr(-0.7, -0.15),
    alpha: rr(0.3, 0.8), alphaDir: Math.random() > 0.5 ? 0.005 : -0.005,
    hue: Math.random() > 0.6 ? 28 : 16,
  }));

  /* FPS cap */
  const TARGET_MS = 1000 / 24;
  let lastTime = 0;
  let rafId;

  function draw(now) {
    rafId = requestAnimationFrame(draw);
    if (now - lastTime < TARGET_MS) return;
    lastTime = now;

    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(strokeCanvas, 0, 0);

    embers.forEach(e => {
      e.x += e.vx;
      e.y += e.vy;
      e.alpha += e.alphaDir;
      if (e.alpha > 0.9)  e.alphaDir = -Math.abs(e.alphaDir);
      if (e.alpha < 0.08) e.alphaDir =  Math.abs(e.alphaDir);
      if (e.y < -10 || e.x < -10 || e.x > W + 10) {
        e.x = rr(0, W); e.y = H + 10;
        e.vx = rr(-0.3, 0.3); e.vy = rr(-0.7, -0.15);
      }
      ctx.globalAlpha = e.alpha;
      ctx.fillStyle = e.hue === 28 ? '#d4840a' : '#ff5a1f';
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  /* Pause when tab hidden */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(rafId);
    } else {
      lastTime = 0;
      rafId = requestAnimationFrame(draw);
    }
  });

  rafId = requestAnimationFrame(draw);
}

/* ──────────────────────────────────────────
   HERO ENTRANCE ANIMATIONS
──────────────────────────────────────────── */
function animateHeroEntrance() {
  const tl = gsap.timeline({ delay: 0.3 });
  tl.to('.hero-eyebrow',  { opacity: 1, x: 0,  duration: 0.7, ease: 'expo.out' })
    .to('.hero-subtitle', { opacity: 1, y: 0,  duration: 0.7, ease: 'expo.out' }, '-=0.3')
    .to('.hero-cta-group',{ opacity: 1, y: 0,  duration: 0.6, ease: 'expo.out' }, '-=0.4')
    .to('.hero-stats',    { opacity: 1,         duration: 0.8, ease: 'expo.out' }, '-=0.5');

  gsap.fromTo('.slash-accent-line',
    { scaleY: 0, transformOrigin: 'top center' },
    { scaleY: 1, duration: 1.2, delay: 0.1, ease: 'expo.out' }
  );
}

function bindChallengeCardHover() {
  document.querySelectorAll('.challenge-card:not(.challenge-card-locked)').forEach(card => {
    card.addEventListener('mouseenter', () => gsap.to(card, { scale: 1.03, duration: 0.2, ease: 'expo.out' }));
    card.addEventListener('mouseleave', () => gsap.to(card, { scale: 1,    duration: 0.3, ease: 'expo.out' }));
  });
}

/* ──────────────────────────────────────────
   SCROLL-TO-TOP FLOATING BUTTON
──────────────────────────────────────────── */
function buildScrollTopBtn() {
  const btn = document.createElement('button');
  btn.id = 'scroll-top-btn';
  btn.setAttribute('aria-label', 'Scroll to top');
  btn.textContent = '↑';
  document.body.appendChild(btn);

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        btn.classList.toggle('is-visible', window.scrollY > 400);
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

/* ──────────────────────────────────────────
   GLOBAL RIGHT-CLICK DISABLE
   Single document-level listener (event
   delegation) suppresses the context menu
   everywhere — main pages, modals, challenge
   views, video players, images, background
   media, and any dynamically injected content
   (delegation means no per-element wiring is
   needed). No alerts/console output; fully
   transparent. Normal left-click, keyboard
   navigation, and other interactions are
   untouched.
──────────────────────────────────────────── */
function initContextMenuGuard() {
  document.addEventListener('contextmenu', e => {
    e.preventDefault();
  });
}

/* ──────────────────────────────────────────
   INITIALIZE
──────────────────────────────────────────── */
function init() {
  persistUnlockedCategories();
  refreshChallengeUI();
  buildScrollTopBtn();
  initCanvas();
  animateHeroEntrance();
  updateScoreDisplays();
  updateSolvedCards();
  initContextMenuGuard();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}