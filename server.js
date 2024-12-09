const express = require('express');
const webpush = require('web-push');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;
const cors = require('cors');

app.use(cors({
  origin: ['https://subtle-sfogliatella-8570dc.netlify.app/', 'https://gold-win-oqm1.onrender.com'],
  methods: ['GET', 'POST']
}));

app.use(express.static('public'));
app.use(express.json());

const publicVapidKey = 'BPsBKO50Wxlv65vzAR9BJ1Rj1cv-VYCWeXUlS-ATxZartqVmATC4Z6lRw6F3IlYSfo7sQXV-QAvhkZCtVoLZHuc';
const privateVapidKey = '1_2JG8-VGXWS08TjiHMf8mJnJOku7F8hb9oyRZaUXbg';

webpush.setVapidDetails(
  'mailto:valerii.bondarenko3007@gmail.com', 
  publicVapidKey,
  privateVapidKey
);

const subscribersFilePath = path.join(__dirname, 'subscribers.json');

function readSubscribers() {
  try {
    const data = fs.readFileSync(subscribersFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

function saveSubscribers(subscribers) {
  fs.writeFileSync(subscribersFilePath, JSON.stringify(subscribers, null, 2));
}

app.post('/subscribe', (req, res) => {
  const subscription = req.body;

  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Невірна підписка' });
  }

  let subscriptions = readSubscribers();
  const isAlreadySubscribed = subscriptions.some(sub => sub.endpoint === subscription.endpoint);

  if (isAlreadySubscribed) {
    return res.status(200).json({ message: 'Цей пристрій вже підписаний.' });
  }

  subscriptions.push(subscription);
  saveSubscribers(subscriptions);

  res.status(201).json({ message: 'Підписка успішно додана!' });
});

app.post('/send', (req, res) => {
  const { title, message } = req.body;

  if (!title || !message) {
    return res.status(400).json({ error: 'Необхідні заголовок і повідомлення' });
  }

  const payload = JSON.stringify({ title, message });

  const subscriptions = readSubscribers();

  Promise.all(subscriptions.map(subscription =>
    webpush.sendNotification(subscription, payload)
  ))
  .then(() => {
    res.status(200).json({ message: 'Повідомлення надіслано!' });
  })
  .catch(err => {
    res.status(500).json({ error: 'Помилка при відправці повідомлень' });
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
