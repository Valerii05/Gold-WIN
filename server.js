const express = require('express');
const webpush = require('web-push');
const bodyParser = require('body-parser');
const app = express();
const port = 3000;
const cors = require('cors');
app.use(cors());

app.use(cors({
  origin: ['https://subtle-sfogliatella-8570dc.netlify.app/', 'https://gold-win-oqm1.onrender.com'],
  methods: ['GET', 'POST']
}));


app.use(express.static('public'));

// Твої публічні та приватні VAPID ключі
const publicVapidKey = 'BPsBKO50Wxlv65vzAR9BJ1Rj1cv-VYCWeXUlS-ATxZartqVmATC4Z6lRw6F3IlYSfo7sQXV-QAvhkZCtVoLZHuc';
const privateVapidKey = '1_2JG8-VGXWS08TjiHMf8mJnJOku7F8hb9oyRZaUXbg';

// Налаштування для web-push
webpush.setVapidDetails(
  'mailto:valerii.footbolis@gmail.com', // Твоя електронна пошта
  publicVapidKey,
  privateVapidKey
);

let subscriptions = []; // Масив для зберігання підписок

// Використовуємо body-parser для обробки JSON-запитів
app.use(bodyParser.json());

// Ендпоінт для підписки
app.post('/subscribe', (req, res) => {
  const subscription = req.body;

  // Перевірка, чи є підписка в запиті
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Невірна підписка' });
  }

  subscriptions.push(subscription); // Додаємо підписку в масив
  console.log('Нова підписка:', subscription);

  // Відповідаємо клієнту, що підписка успішно додана
  res.status(201).json({ message: 'Підписка успішно додана!' });
});

// Ендпоінт для відправки push-повідомлень
app.post('/send', (req, res) => {
  const { title, message } = req.body;

  // Перевіряємо, чи є заголовок і повідомлення в запиті
  if (!title || !message) {
    return res.status(400).json({ error: 'Необхідні заголовок і повідомлення' });
  }

  const payload = JSON.stringify({ title, message });

  // Відправляємо повідомлення всім підписникам
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
