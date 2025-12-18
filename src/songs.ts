// src/songs.ts

export type Song = {
  id: string;
  title: string;
  //   artist: string;
  // Use Tailwind gradient classes here
  color: string;
  title_color: string;
  lyrics: string[];
};

export const SONG_DATABASE: Song[] = [
  {
    id: "1",
    title: "Nuvvunte Chaley",
    // artist: "",
    color: "from-purple-900 via-indigo-900 to-blue-900",
    title_color: "from-blue-900 via-indigo-900 to-purple-900",
    lyrics: [
      "Oka Chooputo Naalone Puttinde",
      "Edo Vintaga Gundelo Cherinde",
      "Nuvvavaro Naalo Ani Adigane",
      "Tanega Premani Thelipinde",

      "Parichayam Ledani Adiga Premante",
      "Kalisanga Ikapai Manamega Ande",
      "Vethikina Dorakani Artham Premade",
      "Adi Neekento Oka Matalo Cheppale",

      "Nuvvunte Chaley",
      "Nuvvunte Chaley",
      "Nuvvunte Chaley",

      "Matalatho Cheppamante Cheppalene",
      "Bhaavamedo Bhaashalake Andanande",
      "Ademito Kuduruga Undalene Nuvvunte",
      "Adigite Ademito Ardhankade",

      "Ninna Monna Naalo Unna Nene Kaade",
      "Puttindante Neetho Thappa",
      "Pone Pode Premanthe",

      "Daareleni Oorine Adigaanuga",
      "Nuvvega Daarani Naaku Chooputundi",
      "Kammukunna Mabbulo Vethikaanuga",
      "Are Gaali Vaanai Nannu Thaakutundi",
      "Naake Theliyani Naalo Yuddhama",

      "Lolona Sandhrama",
      "Lede Pongutunnade Inkedo",

      "Peru Leducuga Inthe Maata Raaduga",
      "Anthe Oppukomari Vinthele",

      "Nuvvunte Chale",
      "Matalatho Cheppamante Cheppalene",
      "Bhaavamedo Bhaashalake Andanande",
      "Ademito Kuduruga Undalene Nuvvunte",
      "Adigite Ademito Ardhankade",

      "Ninna Monna Naalo Unna Nene Kaade",
      "Puttindante Neetho Thappa",
      "Pone Pode Premanthe",

      "Oo Oo Oo Oo Nuvvunte Chaley",
      "Oo Oo Oo Oo Nuvvunte Chaley",

      "Nuvvunte Chaley",

      // ... Add full lyrics here
    ],
  },
  {
    id: "2",
    title: "Yellow", // Replace with your Song 2
    // artist: "Coldplay",
    color: "from-yellow-700 via-orange-800 to-red-900",
    title_color: "from-red-900 via-orange-800 to-yellow-700",
    lyrics: [
      "Look at the stars",
      "Look how they shine for you",
      "And everything you do",
      "Yeah, they were all yellow",
      "I came along",
      "I wrote a song for you",
      "And all the things you do",
      "And it was called Yellow",
    ],
  },
  {
    id: "3",
    title: "Sunil", // Replace with your Song 2
    // artist: "Coldplay",
    color: "from-yellow-700 via-orange-800 to-red-900",
    title_color: "from-red-900 via-orange-800 to-yellow-700",
    lyrics: [
      "sunil mayya  at the stars",
      "Look how they shine for you",
      "And everything you do",
      "Yeah, they were all yellow",
      "I came along",
      "I wrote a song for you",
      "And all the things you do",
      "And it was called Yellow",
    ],
  },
];

// colors
// "from-red-900 via-pink-800 to-purple-900"
// "from-orange-900 via-red-800 to-pink-900"
// "from-amber-900 via-orange-700 to-red-800"
// "from-yellow-800 via-amber-900 to-orange-950"
// Cool & Moody
// typescript
// "from-blue-950 via-indigo-900 to-purple-900"
// "from-cyan-900 via-blue-900 to-indigo-950"
// "from-teal-900 via-cyan-900 to-blue-950"
// "from-slate-900 via-blue-900 to-indigo-900"
// Neon & Electric
// typescript
// "from-fuchsia-900 via-purple-800 to-blue-900"
// "from-pink-900 via-fuchsia-800 to-violet-900"
// "from-violet-900 via-purple-800 to-fuchsia-900"
// "from-purple-950 via-fuchsia-900 to-pink-800"
// Earthy & Deep
// typescript
// "from-stone-900 via-amber-950 to-orange-900"
// "from-neutral-950 via-stone-900 to-zinc-900"
// "from-emerald-950 via-teal-900 to-cyan-950"
// "from-green-950 via-emerald-900 to-teal-900"
// Dramatic Contrasts
// typescript
// "from-rose-950 via-red-900 to-orange-950"
// "from-indigo-950 via-violet-900 to-fuchsia-950"
// "from-lime-900 via-green-900 to-emerald-950"
// "from-sky-950 via-blue-900 to-violet-950"
