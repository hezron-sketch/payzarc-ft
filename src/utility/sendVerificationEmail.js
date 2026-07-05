import axios from 'axios';
import { API_URL } from '../utility/constants';  // Assume same as your register post

export async function sendVerificationEmail(email) {
  try {
    const response = await axios.post(`${API_URL}/api/send-verification-email`, { email });
    return response.data.generatedAt;  // Return ISO string for timer
  } catch (error) {
    throw new Error('Failed to send email');
  }
}