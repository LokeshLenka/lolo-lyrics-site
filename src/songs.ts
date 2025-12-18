// src/songs.ts

export type Song = {
  id: string;
  title: string;
  artist: string;
  // Use Tailwind gradient classes here
  color: string;
  lyrics: string[];
};

export const SONG_DATABASE: Song[] = [
  {
    id: "1",
    title: "Midnight City", // Replace with your Song 1
    artist: "M83",
    color: "from-purple-900 via-indigo-900 to-blue-900",
    lyrics: [
      "Waiting in a car",
      "Waiting for a ride in the dark",
      "The night city grows",
      "Look and see her eyes, they glow",
      "Waiting in a car",
      "Waiting for a ride in the dark",
      // ... Add full lyrics here
    ],
  },
  {
    id: "2",
    title: "Yellow", // Replace with your Song 2
    artist: "Coldplay",
    color: "from-yellow-700 via-orange-800 to-red-900",
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
];
