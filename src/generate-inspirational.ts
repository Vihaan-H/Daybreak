import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const baseQuotes = [
  { text: "Imagination is more important than knowledge.", author: "Albert Einstein" },
  { text: "The present is theirs; the future, for which I really worked, is mine.", author: "Nikola Tesla" },
  { text: "Genius is one percent inspiration and ninety-nine percent perspiration.", author: "Thomas Edison" },
  { text: "The Tao that can be told is not the eternal Tao.", author: "Lao Tzu" },
  { text: "Do not do to others what you do not want done to yourself.", author: "Confucius" },
  { text: "Peace comes from within. Do not seek it without.", author: "Buddha" },
  { text: "Be the change that you wish to see in the world.", author: "Mahatma Gandhi" },
  { text: "I have a dream.", author: "Martin Luther King Jr." },
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle" },
  { text: "Courage is knowing what not to fear.", author: "Plato" },
  { text: "The unexamined life is not worth living.", author: "Socrates" },
  { text: "The wound is the place where the Light enters you.", author: "Rumi" },
  { text: "What lies behind us and what lies before us are tiny matters compared to what lies within us.", author: "Ralph Waldo Emerson" },
  { text: "Desire is a contract you make with yourself to be unhappy until you get what you want.", author: "Naval Ravikant" },
  { text: "Do nothing which is of no use.", author: "Miyamoto Musashi" },
  { text: "The only way to make sense out of change is to plunge into it, move with it, and join the dance.", author: "Alan Watts" },
  { text: "Memento mori.", author: "Stoic Philosophy" },
  { text: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
  { text: "The best way to predict the future is to create it.", author: "Peter Drucker" },
  { text: "Your work is going to fill a large part of your life, and the only way to be truly satisfied is to do what you believe is great work.", author: "Steve Jobs" },
  { text: "The mind is everything. What you think you become.", author: "Buddha" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "The only limit to our realization of tomorrow will be our doubts of today.", author: "Franklin D. Roosevelt" },
  { text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky" },
  { text: "The journey of a thousand miles begins with one step.", author: "Lao Tzu" },
  { text: "What we think, we become.", author: "Buddha" },
  { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "The only source of knowledge is experience.", author: "Albert Einstein" },
  { text: "I think, therefore I am.", author: "René Descartes" },
  { text: "To be or not to be, that is the question.", author: "William Shakespeare" }
];

const allQuotes = [];
for (let i = 0; i < 30; i++) {
  allQuotes.push(...baseQuotes);
}

const data = {
  id: "inspirational",
  name: "Inspirational Collection",
  theme: "inspiration motivation wisdom innovation",
  quotes: allQuotes
};

const filePath = path.join(__dirname, '..', 'data', 'quotes', 'inspirational.json');
fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

console.log('Inspirational quotes JSON generated successfully.');