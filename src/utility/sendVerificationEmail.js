import axios from 'axios';
import { API_URL } from '../utility/constants';

export async function sendVerificationEmail(email) {
  try {
    const response = await axios.post(`${API_URL}/api/send-verification-email`, { email });
    return response.data.generatedAt;
  } catch (error) {
    throw new Error('Failed to send email');
  }
}