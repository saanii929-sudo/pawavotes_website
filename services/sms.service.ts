
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

export async function sendSms({
  to,
  message,
  senderId = "PAWAVOTES",
}: SendSmsParams): Promise<SmsResponse> {
  try {
    console.log("Attempting to send SMS to:", to);

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

    const cleanPhone = to.replace(/[\s\-\(\)]/g, "");
    let phoneNumber = cleanPhone;
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

    const response = await fetch(apiUrl, {
      method: "GET",
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `SMS API returned status ${response.status}: ${errorText}`,
      );
    }
    const data = await response.json();
    if (data.code === "ok" || data.status === "success") {
      return {
        success: true,
        message: "SMS sent successfully",
      };
    } else {
      return {
        success: false,
        error: data.message || "Failed to send SMS",
      };
    }
  } catch (error: any) {
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
