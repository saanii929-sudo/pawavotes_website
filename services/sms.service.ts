
interface SendSmsParams {
  to: string;
  message: string;
  senderId?: string;
}

interface SmsResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// Convert scientific notation to full number string without losing precision
function scientificToDecimal(num: string): string {
  const numStr = String(num).trim();
  
  // Check if it's in scientific notation
  if (!numStr.includes('E') && !numStr.includes('e')) {
    return numStr;
  }
  
  // Parse the scientific notation manually to avoid precision loss
  const [base, exponent] = numStr.split(/[eE]/);
  const exp = parseInt(exponent, 10);
  
  if (exp === 0) {
    return base;
  }
  
  // Remove decimal point from base
  const [intPart, decPart = ''] = base.split('.');
  const digits = intPart + decPart;
  
  // For positive exponents, we're moving decimal point to the right
  if (exp > 0) {
    const totalDigits = digits.length;
    const zerosToAdd = exp - decPart.length;
    
    if (zerosToAdd >= 0) {
      // Need to add zeros at the end
      return digits + '0'.repeat(zerosToAdd);
    } else {
      // Decimal point moves within existing digits
      const newDecimalPos = intPart.length + exp;
      return digits.slice(0, newDecimalPos) + '.' + digits.slice(newDecimalPos);
    }
  } else {
    // For negative exponents, we're moving decimal point to the left
    const zerosToAdd = Math.abs(exp) - intPart.length;
    if (zerosToAdd >= 0) {
      return '0.' + '0'.repeat(zerosToAdd) + digits;
    } else {
      const newDecimalPos = intPart.length + exp;
      return digits.slice(0, newDecimalPos) + '.' + digits.slice(newDecimalPos);
    }
  }
}

export async function sendSms({
  to,
  message,
  senderId = "PAWAVOTES",
}: SendSmsParams): Promise<SmsResponse> {
  try {
    // Convert to string and handle scientific notation
    let phoneStr = String(to).trim();
    
    console.log("Original phone input:", phoneStr);
    
    // Handle scientific notation (e.g., 2.33553E+11)
    if (phoneStr.includes('E') || phoneStr.includes('e')) {
      phoneStr = scientificToDecimal(phoneStr);
      console.log("Converted from scientific notation to:", phoneStr);
    }
    
    // Remove any decimal points (in case of conversion artifacts)
    if (phoneStr.includes('.')) {
      phoneStr = phoneStr.split('.')[0];
      console.log("Removed decimal point:", phoneStr);
    }
    
    console.log("Attempting to send SMS to:", phoneStr);

    const apiKey = process.env.ARKESEL_API_KEY;

    if (!apiKey) {
      console.error("ARKESEL_API_KEY not configured");
      return {
        success: false,
        error: "SMS service not configured",
      };
    }

    console.log("SMS Config:", {
      apiKeyPresent: !!apiKey,
      senderId,
      messageLength: message.length,
    });

    // Clean phone number
    const cleanPhone = phoneStr.replace(/[\s\-\(\)]/g, "");
    let phoneNumber = cleanPhone;
    
    // Format to international format
    if (!phoneNumber.startsWith("+")) {
      if (phoneNumber.startsWith("0")) {
        phoneNumber = "+233" + phoneNumber.substring(1);
      } else if (!phoneNumber.startsWith("233")) {
        phoneNumber = "+233" + phoneNumber;
      } else {
        phoneNumber = "+" + phoneNumber;
      }
    }
    const apiUrl = `https://sms.arkesel.com/sms/api?action=send-sms&api_key=${apiKey}&to=${encodeURIComponent(phoneNumber)}&from=${encodeURIComponent(senderId)}&sms=${encodeURIComponent(message)}`;

    console.log("Sending SMS to formatted number:", phoneNumber);
    
    const response = await fetch(apiUrl, {
      method: "GET",
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("SMS API error response:", errorText);
      throw new Error(
        `SMS API returned status ${response.status}: ${errorText}`,
      );
    }
    
    const data = await response.json();
    console.log("SMS API response:", data);
    
    if (data.code === "ok" || data.status === "success") {
      console.log("SMS sent successfully to:", phoneNumber);
      return {
        success: true,
        message: "SMS sent successfully",
      };
    } else {
      console.error("SMS API returned error:", data);
      return {
        success: false,
        error: data.message || "Failed to send SMS",
      };
    }
  } catch (error: any) {
    console.error("SMS sending exception:", error);
    return {
      success: false,
      error: error.message || "Failed to send SMS",
    };
  }
}

export async function sendVoterCredentialsSms(
  phone: string,
  name: string,
  token: string,
  password: string,
  electionTitle: string,
  startDate?: Date,
  endDate?: Date,
): Promise<boolean> {
  const loginUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  let dateInfo = "";
  if (startDate && endDate) {
    dateInfo = `\n\nVoting Period:\n${formatDate(startDate)} - ${formatDate(endDate)}`;
  }
  const message = `Hello ${name},

Your voting credentials for ${electionTitle}:

Token: ${token}
Password: ${password}${dateInfo}

Vote at: ${loginUrl}/election/login

Keep these credentials safe.

`;

  const result = await sendSms({
    to: phone,
    message,
    senderId: "PAWAVOTES",
  });

  if (result.success) {
    console.log("Voter credentials SMS sent successfully to:", phone);
  } else {
    console.error("Failed to send voter credentials SMS:", result.error);
  }

  return result.success;
}

export async function checkSmsBalance(): Promise<{
  success: boolean;
  balance?: number;
  smsCount?: number;
  currency?: string;
  error?: string;
}> {
  try {
    const apiKey = process.env.ARKESEL_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        error: "SMS service not configured",
      };
    }

    const apiUrl = `https://sms.arkesel.com/sms/api?action=check-balance&api_key=${apiKey}&response=json`;

    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error("Failed to check SMS balance");
    }

    const data = await response.json();

    // Arkesel returns balance in GHS, not SMS count
    const balance = data.balance || 0;
    // Estimate SMS count (average cost ~0.07 GHS per SMS)
    const estimatedSmsCount = balance > 0 ? Math.floor(balance / 0.07) : 0;

    return {
      success: true,
      balance: balance,
      smsCount: estimatedSmsCount,
      currency: "GHS",
    };
  } catch (error: any) {
    console.error("Check SMS balance error:", error);
    return {
      success: false,
      error: error.message || "Failed to check SMS balance",
    };
  }
}
