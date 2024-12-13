const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
require('dotenv').config();


const app = express();

app.use(bodyParser.json());
app.use(cors());
const dbUri = process.env.DB_URI;
const port = process.env.PORT || 5000;



const formSchema = new mongoose.Schema({
  Email: { type: String },
  password: { type: String, required: true },
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  questions: { type: Object },

  formsName: [
    {
      title: { type: String },
      questions: { type: Array },
      ResponseofQuestions: { type: Array } 
    }
  ],
});
const FormDat = mongoose.model('FormData', formSchema, 'FormData');


mongoose
  .connect(dbUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('Could not connect to MongoDB', err));


app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await FormDat.findOne({ Email: email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.status(200).json({ message: 'Login successfully', user });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'An unexpected error occurred' });
  }
});

app.post('/submit-form', async (req, res) => {
  const { email, password, questions ,title} = req.body;

  if (!email || !password || !questions) {
    console.log('Email, password, and form questions are required');

    return res.status(400).json({ message: 'Email, password, and form questions are required' });
  }

  try {
    const user = await FormDat.findOne({ Email: email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid password' });
    }
    let size = user.formsName.length;
    user.formsName[size] = {questions,title};
    await user.save();
    res.status(200).json({ message: 'Form questions saved successfully' });
  } catch (error) {
    console.error('Error submitting form:', error);
    res.status(500).json({ error: 'An unexpected error occurred' });
  }
});
app.post("/submit", async (req, res) => {
  try {
    const existingUser = await FormDat.findOne({ Email: req.body.Email });
    
    if (existingUser) {
      return res.status(400).json({ error: "Email already exists. Please use a different email." });
    }

    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    const newFormData = new FormDat({
      Email: req.body.Email,
      password: hashedPassword,
      first_name: req.body.first_name,
      last_name: req.body.last_name,
    });

    const savedFeedback = await newFormData.save();

    res.status(201).json({ message: "Form data saved successfully", data: savedFeedback });
  } catch (error) {
    console.error("Error saving form data:", error);
    res.status(500).json({ error: "An unexpected error occurred" });
  }
});

app.post("/submit-ans", async (req, res) => {
  const { email, title, responses } = req.body;

  if (!email || !title || !responses) {
    return res.status(400).json({ message: 'Email, title, and responses are required' });
  }

  try {
    const user = await FormDat.findOne({ Email: email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.formsName || !Array.isArray(user.formsName)) {
      return res.status(500).json({ message: 'Invalid form data structure' });
    }

    const formIndex = user.formsName.findIndex((form) => form.title === title);
    if (formIndex === -1) {
      return res.status(404).json({ message: `Form with title '${title}' not found` });
    }

    const form = user.formsName[formIndex];
    if (!form.ResponseofQuestions) {
      form.ResponseofQuestions = [];
    }
    console.log(form);
    form.ResponseofQuestions[form.ResponseofQuestions.length]=responses;

    await user.save();

    res.status(200).json({
      message: 'Answers stored successfully',
      form: form
    });
  } catch (error) {
    console.error('Error storing answer:', error);
    res.status(500).json({ error: 'An unexpected error occurred' });
  }
});

app.get('/get-responses/:email/:title', async (req, res) => {
  const { email, title } = req.params;

  try {
    const user = await FormDat.findOne({ Email: email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const form = user.formsName.find((form) => form.title === title);
    if (!form) {
      return res.status(404).json({ message: `Form with title '${title}' not found` });
    }

    res.status(200).json({ responses: form.ResponseofQuestions || [] });
  } catch (error) {
    console.error('Error fetching responses:', error);
    res.status(500).json({ error: 'An unexpected error occurred' });
  }
});

app.get('/get-questions/:email/:title', async (req, res) => {
  const { email, title } = req.params;
  console.log(req.params);
  

  try {
    const user = await FormDat.findOne({ Email: email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const form = user.formsName.find((form) => form.title === title);
    if (!form) {
      return res.status(404).json({ message: `Form with title '${title}' not found` });
    }

    res.status(200).json({ questions: form.questions || [] });
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ error: 'An unexpected error occurred' });
  }
});




app.post("/delete-form", async (req, res) => {
  const { email, title } = req.body;
  console.log(req.body);

  try {
    const user = await FormDat.findOne({ Email: email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const formIndex = user.formsName.findIndex((form) => form.title === title);
    if (formIndex === -1) {
      return res.status(404).json({ message: `Form with title '${title}' not found` });
    }

    user.formsName.splice(formIndex, 1); 
    await user.save();

    res.status(200).json({ message: 'Form deleted successfully' });
  } catch (error) {
    console.error('Error deleting form:', error);
    res.status(500).json({ error: 'An unexpected error occurred' });
  }
});


app.post('/formname',async(req,res)=>{
  try {
    const Formsdata= await FormDat.findOne(req.email)
    if (Formsdata) {
      res.status(200).json(Formsdata)
    }
    
  } catch (error) {
    console.error('Error deleting form:', error);
    res.status(500).json({ error: 'An unexpected error occurred' });
  }
})


app.listen(5000, () => {
  console.log(`Server is running on http://localhost:${port}`);
});