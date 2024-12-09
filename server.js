const express = require('express');
const webpush = require('web-push');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;
const cors = require('cors');
app.use(cors());

const sqlite3 = require('sqlite3').verbose();

// Підключення до бази даних (створюється файл subscribers.db, якщо його немає)
const db = new sqlite3.Database('./subscribers.db', (err) => {
  if (err) {
    console.error('Помилка підключення до бази даних:', err.message);
  } else {
    console.log('Підключено до SQLite бази даних.');
  }
});

// Створення таблиці, якщо її ще немає
db.run(`
  CREATE TABLE IF NOT EXISTS subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint TEXT UNIQUE NOT NULL,
    keys TEXT NOT NULL
  )
`, (err) => {
  if (err) {
    console.error('Помилка при створенні таблиці:', err.message);
  } else {
    console.log('Таблиця subscribers готова.');
  }
});




// Додаємо дозволені домени
app.use(cors({
  origin: ['https://subtle-sfogliatella-8570dc.netlify.app/', 'https://gold-win-oqm1.onrender.com'],
  methods: ['GET', 'POST']
}));

app.use(express.static('public'));

// Додано для обробки JSON запитів
app.use(express.json());  // <-- Тут додано!

// Твої публічні та приватні VAPID ключі
const publicVapidKey = 'BPsBKO50Wxlv65vzAR9BJ1Rj1cv-VYCWeXUlS-ATxZartqVmATC4Z6lRw6F3IlYSfo7sQXV-QAvhkZCtVoLZHuc';
const privateVapidKey = '1_2JG8-VGXWS08TjiHMf8mJnJOku7F8hb9oyRZaUXbg';

// Налаштування для web-push
webpush.setVapidDetails(
  'mailto:valerii.bondarenko3007@gmail.com', 
  publicVapidKey,
  privateVapidKey
);

// Шлях до файлу, в якому зберігаються підписки
const subscribersFilePath = path.join(__dirname, 'subscribers.json');

// Функція для читання підписок з файлу
function readSubscribers() {
  try {
    const data = fs.readFileSync(subscribersFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // Якщо файл не існує або є помилка при зчитуванні, повертаємо порожній масив
    return [];
  }
}

// Функція для збереження підписок у файл
function saveSubscribers(subscribers) {
  fs.writeFileSync(subscribersFilePath, JSON.stringify(subscribers, null, 2));
}

// Ендпоінт для підписки
app.post('/subscribe', (req, res) => {
  const subscription = req.body;

  // Перевірка, чи є підписка в запиті
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Невірна підписка' });
  }

  // Підготовка даних для запису
  const endpoint = subscription.endpoint;
  const keys = JSON.stringify(subscription.keys); // Зберігаємо ключі як текст

  // Додаємо підписку до бази даних
  db.run(`
    INSERT INTO subscribers (endpoint, keys) VALUES (?, ?)
  `, [endpoint, keys], (err) => {
    if (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(200).json({ message: 'Цей пристрій вже підписаний.' });
      }
      console.error('Помилка при додаванні підписки:', err.message);
      return res.status(500).json({ error: 'Помилка сервера.' });
    }

    console.log('Нова підписка:', subscription);
    res.status(201).json({ message: 'Підписка успішно додана!' });
  });
});


// Ендпоінт для відправки push-повідомлень
app.post('/send', (req, res) => {
  console.log('Request body:', req.body); // Логування тіла запиту

  const { title, message } = req.body;

  if (!title || !message) {
    return res.status(400).json({ error: 'Необхідні заголовок і повідомлення' });
  }

  const payload = JSON.stringify({ title, message });

  // Логування підписок
  const subscriptions = readSubscribers();
  console.log('Subscriptions:', subscriptions);

  Promise.all(subscriptions.map(subscription =>
    webpush.sendNotification(subscription, payload)
  ))
  .then(() => {
    res.status(200).json({ message: 'Повідомлення надіслано!' });
  })
  .catch(err => {
    res.status(500).json({ error: 'Помилка при відправці повідомлень' });
    console.error(err);
  });
});

// Запуск сервера
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
