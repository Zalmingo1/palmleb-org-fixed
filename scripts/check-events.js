const mongoose = require('mongoose');
require('dotenv').config({ path: '../env.local' });

async function checkEvents() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check the Event model schema
    const Event = require('../src/models/Event').Event;
    console.log('Event schema:', Event.schema.obj);

    // Check existing events
    const events = await Event.find({});
    console.log('Existing events:', events.length);
    
    if (events.length > 0) {
      console.log('Sample event:', JSON.stringify(events[0], null, 2));
    }

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
  }
}

checkEvents(); 