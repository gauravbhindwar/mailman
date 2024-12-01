import { NextResponse } from 'next/server';
import { connect } from '../../../../lib/dbConfig';
import User from '../../../../models/User';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    
    await connect();
    
    const existingUser = await User.findOne({ username });
    
    if (!existingUser) {
      return NextResponse.json({ available: true });
    }

    // Generate suggestions if username is taken
    const baseUsername = username.replace(/[0-9]+$/, '');
    const suggestions = await generateUsernameSuggestions(baseUsername);
    
    return NextResponse.json({
      available: false,
      suggestions
    });

  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

async function generateUsernameSuggestions(baseUsername) {
  const suggestions = [];
  
  // Try adding random numbers
  for (let i = 0; suggestions.length < 3; i++) {
    const randomNum = Math.floor(Math.random() * 1000);
    const suggestion = `${baseUsername}${randomNum}`;
    
    const exists = await User.findOne({ username: suggestion });
    if (!exists) {
      suggestions.push(suggestion);
    }
  }
  
  return suggestions;
}
