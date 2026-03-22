import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import connectDB from "@/lib/mongodb";
import UssdSession from "@/models/UssdSession";
import EventModel from "@/models/Event";
import TicketOrder from "@/models/TicketOrder";
import { sendTicketConfirmationEmail } from "@/lib/email";
import { sendTicketSmsConfirmation } from "@/services/sms.service";

const MAX_MESSAGE_LENGTH = 160;
const MAX_ERROR_COUNT = 3;
const SESSION_TIMEOUT_MS = 15 * 60 * 1000;
const ITEMS_PER_PAGE = 5;
const MAX_QUANTITY = 10;

function compressMessage(text: string, maxLength = MAX_MESSAGE_LENGTH): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  text = text
    .replace(/Ghana Cedis/g, "GHS")
    .replace(/\n\n\n/g, "\n\n")
    .replace(/ {2,}/g, " ");
  if (text.length > maxLength) text = text.substring(0, maxLength - 3) + "...";
  return text;
}

function truncateName(name: string, maxLength: number): string {
  if (!name) return "";
  if (name.length <= maxLength) return name;
  return name.substring(0, maxLength - 3) + "...";
}

function getNavigationText(step: string): string {
  return step === "welcome" ? "00. Exit" : "0. Back";
}

function handleError(
  session: any,
  message: string,
  continueSession = true
): { message: string; continueSession: boolean } {
  session.data.errorCount = (session.data.errorCount || 0) + 1;
  if (session.data.errorCount > MAX_ERROR_COUNT) {
    return {
      message: "Too many errors. Please dial again to restart.",
      continueSession: false,
    };
  }
  return {
    message: compressMessage(
      `${message}\n\n${getNavigationText(session.currentStep)}`
    ),
    continueSession,
  };
}

function detectMobileProvider(phoneNumber: string): string | null {
  const clean = phoneNumber.replace(/[\s\-+]/g, "");
  let prefix = "";
  if (clean.startsWith("233")) prefix = clean.substring(3, 5);
  else if (clean.startsWith("0")) prefix = clean.substring(1, 3);
  else prefix = clean.substring(0, 2);

  const mtn = ["24", "25", "53", "54", "55", "59", "23", "28"];
  const telecel = ["20", "50"];
  const airtel = ["26", "27", "56", "57"];

  if (mtn.includes(prefix)) return "mtn";
  if (telecel.includes(prefix)) return "vod";
  if (airtel.includes(prefix)) return "tgo";
  return null;
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { sessionID, userID, newSession, msisdn, userData } = body;
    const sessionId = sessionID;
    const phoneNumber = msisdn;
    const text = userData || "";

    let session = await UssdSession.findOne({ sessionId });

    if (!session || newSession === true) {
      session = await UssdSession.create({
        sessionId,
        phoneNumber,
        currentStep: "welcome",
        data: {},
        isActive: true,
        lastActivity: new Date(),
      });
    } else {
      session.lastActivity = new Date();
    }

    const userInput = text.split("*").pop() || "";
    const response = await handleUssdFlow(session, userInput, phoneNumber);
    await session.save();

    return NextResponse.json({
      sessionID: sessionId,
      userID: userID || "CP9VG7Y5TN_dNri2",
      msisdn: phoneNumber,
      message: response.message,
      continueSession: response.continueSession,
    });
  } catch (error: any) {
    console.error("[USSD Tickets] POST error:", error);
    return NextResponse.json({
      sessionID: "",
      userID: "CP9VG7Y5TN_dNri2",
      msisdn: "",
      message: "An error occurred. Please try again later.",
      continueSession: false,
    });
  }
}

async function handleUssdFlow(
  session: any,
  userInput: string,
  phoneNumber: string
) {
  const step = session.currentStep;
  const sessionAge = Date.now() - new Date(session.lastActivity).getTime();

  if (sessionAge > SESSION_TIMEOUT_MS && step !== "welcome") {
    return { message: "Session expired. Please dial again.", continueSession: false };
  }

  if (userInput === "00") {
    return { message: "Thank you for using PawaVotes!", continueSession: false };
  }

   if (userInput === "#") return handleNextPage(session);

  if (userInput === "0") {
    const paginatedSteps = ["select_event", "select_ticket_type"];
    if (
      paginatedSteps.includes(step) &&
      session.data.currentPage &&
      session.data.currentPage > 1
    ) {
      return handlePreviousPage(session);
    }
    if (step === "welcome") {
      return { message: "Thank you for using PawaVotes!", continueSession: false };
    }
    return handleBackNavigation(session);
  }

  switch (step) {
    case "welcome":
      return await showWelcome(session, userInput);
    case "select_event":
      return await handleEventSelection(session, userInput);
    case "select_ticket_type":
      return await handleTicketTypeSelection(session, userInput);
    case "enter_quantity":
      return await handleQuantityInput(session, userInput);
    case "enter_name":
      return await handleNameInput(session, userInput);
    case "confirm":
      return await handleConfirmation(session, userInput, phoneNumber);
    case "confirm_network":
      return await handleNetworkConfirmation(session, userInput, phoneNumber);
    default:
      return { message: "Invalid session. Please dial again.", continueSession: false };
  }
}

function handleBackNavigation(session: any) {
  const stepFlow: Record<string, string> = {
    select_event: "welcome",
    select_ticket_type: "select_event",
    enter_quantity: "select_ticket_type",
    enter_name: "enter_quantity",
    confirm: "enter_name",
    confirm_network: "confirm",
  };

  const prev = stepFlow[session.currentStep];
  if (!prev) return { message: "Cannot go back from here.", continueSession: false };

  session.data.errorCount = 0;
  session.currentStep = prev;
  session.data.currentPage = 1;

  switch (prev) {
    case "welcome":
      return showWelcome(session, "");
    case "select_event":
      return showEventMenu(session);
    case "select_ticket_type":
      return showTicketTypeMenu(session);
    case "enter_quantity": {
      const price = session.data.ticketTypePrice || 0;
      const priceStr = price === 0 ? "Free" : `GHS ${price.toFixed(2)}`;
      return {
        message: compressMessage(
          `${truncateName(session.data.ticketTypeName, 20)}\n${priceStr}/ticket\n\nQty (1-${MAX_QUANTITY}):\n\n${getNavigationText("enter_quantity")}`
        ),
        continueSession: true,
      };
    }
    case "enter_name":
      return {
        message: compressMessage(
          `Qty: ${session.data.quantity} ticket(s)\n\nEnter your full name:\n\n${getNavigationText("enter_name")}`
        ),
        continueSession: true,
      };
    default:
      return { message: "Navigation error.", continueSession: false };
  }
}

function handleNextPage(session: any) {
  const currentPage = session.data.currentPage || 1;
  const totalPages = session.data.totalPages || 1;
  if (currentPage >= totalPages) {
    return {
      message: "You are on the last page. Select an option or press 0 to go back.",
      continueSession: true,
    };
  }
  session.data.currentPage = currentPage + 1;
  if (session.currentStep === "select_event") return showEventMenu(session);
  if (session.currentStep === "select_ticket_type") return showTicketTypeMenu(session);
  return { message: "Pagination not available here.", continueSession: true };
}

function handlePreviousPage(session: any) {
  const currentPage = session.data.currentPage || 1;
  if (currentPage <= 1) {
    return { message: "You are on the first page.", continueSession: true };
  }
  session.data.currentPage = currentPage - 1;
  if (session.currentStep === "select_event") return showEventMenu(session);
  if (session.currentStep === "select_ticket_type") return showTicketTypeMenu(session);
  return { message: "Pagination not available here.", continueSession: true };
}

function showEventMenu(session: any) {
  const events: any[] = session.data.events || [];
  const currentPage = session.data.currentPage || 1;
  const totalPages = Math.ceil(events.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageEvents = events.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  if (pageEvents.length === 0) {
    return { message: "No events available at the moment.", continueSession: false };
  }

  let menu = `Select Event (${currentPage}/${totalPages}):\n\n`;
  pageEvents.forEach((ev: any, i: number) => {
    menu += `${i + 1}. ${truncateName(ev.title, 28)}\n`;
  });
  if (currentPage < totalPages) menu += `\n#. Next Page`;
  menu += `\n\n${getNavigationText("select_event")}`;

  session.data.totalPages = totalPages;
  session.data.pageStartIndex = startIndex;

  return { message: compressMessage(menu), continueSession: true };
}

function showTicketTypeMenu(session: any) {
  const ticketTypes: any[] = session.data.ticketTypes || [];
  const currentPage = session.data.currentPage || 1;
  const totalPages = Math.ceil(ticketTypes.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageTypes = ticketTypes.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  if (pageTypes.length === 0) {
    return { message: "No ticket types available for this event.", continueSession: false };
  }

  const eventName = truncateName(session.data.eventTitle, 22);
  let menu = `${eventName}\n\nSelect Ticket:\n\n`;
  pageTypes.forEach((tt: any, i: number) => {
    const avail = tt.capacity - tt.sold;
    const priceStr = tt.price === 0 ? "Free" : `GHS ${tt.price.toFixed(2)}`;
    menu += `${i + 1}. ${truncateName(tt.name, 14)} - ${priceStr} (${avail} left)\n`;
  });
  if (currentPage < totalPages) menu += `\n#. Next Page`;
  menu += `\n\n${getNavigationText("select_ticket_type")}`;

  session.data.totalPages = totalPages;
  session.data.pageStartIndex = startIndex;

  return { message: compressMessage(menu), continueSession: true };
}

async function showWelcome(session: any, userInput?: string) {
  const now = new Date();
  const events = await EventModel.find({
    status: { $in: ["published", "ongoing"] },
    "settings.isPublic": true,
    endDate: { $gte: now },
  })
    .select("_id title startDate startTime venue ticketTypes code ticketBg ticketTextColor")
    .lean();

  const available = events.filter((ev: any) =>
    ev.ticketTypes?.some((tt: any) => tt.capacity - tt.sold > 0)
  );

  session.data.events = available;
  session.data.currentPage = 1;
  session.markModified("data");

  const welcomeMsg = compressMessage(
    `Welcome to PawaVotes\nTicket Purchase\n\n1. Browse Events\n\n${getNavigationText("welcome")}`
  );

  if (!userInput || userInput === "") {
    return { message: welcomeMsg, continueSession: true };
  }

  if (userInput === "1") {
    if (available.length === 0) {
      return {
        message: "No events with available tickets at the moment. Please check back later.",
        continueSession: false,
      };
    }
    session.currentStep = "select_event";
    return showEventMenu(session);
  }

  return { message: welcomeMsg, continueSession: true };
}

async function handleEventSelection(session: any, userInput: string) {
  const events: any[] = session.data?.events || [];
  if (events.length === 0) {
    return { message: "Session expired. Please dial again.", continueSession: false };
  }

  const selectedIndex = parseInt(userInput) - 1;
  const pageStartIndex = session.data.pageStartIndex || 0;
  const actualIndex = pageStartIndex + selectedIndex;

  if (
    isNaN(selectedIndex) ||
    selectedIndex < 0 ||
    selectedIndex >= ITEMS_PER_PAGE ||
    actualIndex >= events.length
  ) {
    return handleError(session, "Invalid selection. Enter a valid number.");
  }

  const selected = events[actualIndex];
  if (!selected) return handleError(session, "Event not found. Please try again.");

  const fresh: any = await EventModel.findById(selected._id)
    .select("title startDate startTime endDate venue ticketTypes code ticketBg ticketTextColor")
    .lean();

  if (!fresh) return handleError(session, "Event not found. Please try again.");

  const availTypes = (fresh.ticketTypes || []).filter(
    (tt: any) => tt.capacity - tt.sold > 0
  );
  if (availTypes.length === 0) {
    return handleError(session, "This event is sold out. Please choose another.");
  }

  const venueName = fresh.venue?.isVirtual
    ? "Virtual Event"
    : fresh.venue?.name || "TBD";
  const venueAddress = fresh.venue?.isVirtual
    ? fresh.venue?.virtualLink || ""
    : [fresh.venue?.address, fresh.venue?.city, fresh.venue?.country]
        .filter(Boolean)
        .join(", ");

  session.data.eventId = fresh._id.toString();
  session.data.eventTitle = fresh.title;
  session.data.eventCode = fresh.code;
  session.data.eventDate = fresh.startDate?.toISOString() || "";
  session.data.eventTime = fresh.startTime || "";
  session.data.venueName = venueName;
  session.data.venueAddress = venueAddress;
  session.data.ticketBg = fresh.ticketBg || "";
  session.data.ticketTextColor = fresh.ticketTextColor || "light";
  session.data.ticketTypes = availTypes;
  session.data.currentPage = 1;
  session.data.errorCount = 0;
  session.markModified("data");

  session.currentStep = "select_ticket_type";
  return showTicketTypeMenu(session);
}

async function handleTicketTypeSelection(session: any, userInput: string) {
  const ticketTypes: any[] = session.data?.ticketTypes || [];
  if (ticketTypes.length === 0) {
    return { message: "Session expired. Please dial again.", continueSession: false };
  }

  const selectedIndex = parseInt(userInput) - 1;
  const pageStartIndex = session.data.pageStartIndex || 0;
  const actualIndex = pageStartIndex + selectedIndex;

  if (
    isNaN(selectedIndex) ||
    selectedIndex < 0 ||
    selectedIndex >= ITEMS_PER_PAGE ||
    actualIndex >= ticketTypes.length
  ) {
    return handleError(session, "Invalid selection. Enter a valid number.");
  }

  const selected = ticketTypes[actualIndex];
  if (!selected) return handleError(session, "Ticket type not found. Please try again.");

  const available = selected.capacity - selected.sold;

  session.data.ticketTypeId = selected.id;
  session.data.ticketTypeName = selected.name;
  session.data.ticketTypePrice = selected.price;
  session.data.ticketTypeColor = selected.color;
  session.data.maxQuantity = Math.min(MAX_QUANTITY, available);
  session.data.errorCount = 0;
  session.markModified("data");

  session.currentStep = "enter_quantity";

  const priceStr = selected.price === 0 ? "Free" : `GHS ${selected.price.toFixed(2)}`;
  return {
    message: compressMessage(
      `${truncateName(selected.name, 22)}\n${priceStr}/ticket\n${available} available\n\nEnter qty (1-${session.data.maxQuantity}):\n\n${getNavigationText("enter_quantity")}`
    ),
    continueSession: true,
  };
}

async function handleQuantityInput(session: any, userInput: string) {
  const qty = parseInt(userInput);
  const maxAllowed = session.data.maxQuantity || MAX_QUANTITY;

  if (isNaN(qty) || qty < 1 || qty > maxAllowed) {
    return handleError(session, `Enter a number between 1 and ${maxAllowed}.`);
  }

  session.data.quantity = qty;
  session.data.totalAmount = qty * (session.data.ticketTypePrice || 0);
  session.data.errorCount = 0;
  session.markModified("data");
  session.currentStep = "enter_name";

  return {
    message: compressMessage(
      `Qty: ${qty} ticket(s)\nTotal: ${session.data.ticketTypePrice === 0 ? "Free" : `GHS ${session.data.totalAmount.toFixed(2)}`}\n\nEnter your full name:\n\n${getNavigationText("enter_name")}`
    ),
    continueSession: true,
  };
}

async function handleNameInput(session: any, userInput: string) {
  const name = userInput.trim();

  if (!name || name.length < 2) {
    return handleError(session, "Please enter a valid name (min 2 characters).");
  }
  if (name.length > 60) {
    return handleError(session, "Name too long. Please enter a shorter name.");
  }

  session.data.buyerName = name;
  session.data.errorCount = 0;
  session.markModified("data");
  session.currentStep = "confirm";

  const eventName = truncateName(session.data.eventTitle, 22);
  const ticketName = truncateName(session.data.ticketTypeName, 15);
  const totalStr =
    session.data.ticketTypePrice === 0
      ? "Free"
      : `GHS ${session.data.totalAmount.toFixed(2)}`;

  return {
    message: compressMessage(
      `Order Summary\n\nEvent: ${eventName}\nTicket: ${ticketName}\nQty: ${session.data.quantity}\nName: ${truncateName(name, 18)}\nTotal: ${totalStr}\n\n1. Confirm\n2. Cancel`
    ),
    continueSession: true,
  };
}

async function handleConfirmation(
  session: any,
  userInput: string,
  phoneNumber: string
) {
  if (userInput === "2") {
    session.isActive = false;
    return { message: "Order cancelled. Thank you for using PawaVotes.", continueSession: false };
  }

  if (userInput !== "1") {
    return handleError(session, "Invalid selection. Enter 1 to confirm or 2 to cancel.");
  }

  if (session.data.ticketTypePrice === 0) {
    return await processFreeTicket(session, phoneNumber);
  }

  const provider = detectMobileProvider(phoneNumber);
  if (!provider) {
    session.currentStep = "confirm_network";
    return {
      message: `Confirm your network:\n\n1. MTN\n2. Telecel\n3. AirtelTigo\n\n0. Cancel`,
      continueSession: true,
    };
  }

  return await processTicketPayment(session, phoneNumber, provider);
}

async function handleNetworkConfirmation(
  session: any,
  userInput: string,
  phoneNumber: string
) {
  const networkMap: Record<string, string> = { "1": "mtn", "2": "vod", "3": "tgo" };
  const provider = networkMap[userInput];

  if (!provider) {
    return {
      message: "Invalid selection. Enter 1 for MTN, 2 for Telecel, 3 for AirtelTigo.",
      continueSession: false,
    };
  }

  return await processTicketPayment(session, phoneNumber, provider);
}

async function processFreeTicket(session: any, phoneNumber: string) {
  try {
    const reference = `TKT${Date.now()}${randomBytes(2).toString("hex")}`.substring(0, 32);
    const ticketCodes = Array.from({ length: session.data.quantity }, (_, i) =>
      `${session.data.eventCode}-${Date.now()}-${i + 1}-${randomBytes(3)
        .toString("hex")
        .toUpperCase()}`
    );

    await TicketOrder.create({
      reference,
      eventId: session.data.eventId,
      eventTitle: session.data.eventTitle,
      eventDate: session.data.eventDate,
      eventTime: session.data.eventTime,
      venueName: session.data.venueName,
      venueAddress: session.data.venueAddress,
      ticketTypeId: session.data.ticketTypeId,
      ticketTypeName: session.data.ticketTypeName,
      ticketTypeColor: session.data.ticketTypeColor || "#10b981",
      ticketBg: session.data.ticketBg || "",
      ticketTextColor: session.data.ticketTextColor || "light",
      quantity: session.data.quantity,
      unitPrice: 0,
      totalAmount: 0,
      buyerName: session.data.buyerName,
      buyerEmail: `${phoneNumber.replace(/[^0-9]/g, "")}@ussd.pawavotes.com`,
      buyerPhone: phoneNumber,
      status: "completed",
      ticketCodes,
    });

    await EventModel.findOneAndUpdate(
      { _id: session.data.eventId, "ticketTypes.id": session.data.ticketTypeId },
      {
        $inc: {
          "ticketTypes.$.sold": session.data.quantity,
          totalSold: session.data.quantity,
        },
      }
    );

    session.isActive = false;

    sendTicketSmsConfirmation(
      phoneNumber,
      session.data.buyerName,
      session.data.eventTitle,
      session.data.ticketTypeName,
      session.data.quantity,
      reference,
    ).catch(() => {});

    return {
      message: compressMessage(
        `Ticket Confirmed!\nRef: ${reference.slice(-10)}\n\nEvent: ${truncateName(session.data.eventTitle, 20)}\nType: ${truncateName(session.data.ticketTypeName, 15)} (Free)\nQty: ${session.data.quantity}\n\nThank you!`
      ),
      continueSession: false,
    };
  } catch (error: any) {
    console.error("[USSD Tickets] processFreeTicket error:", error);
    return { message: "Error processing your ticket. Please try again.", continueSession: false };
  }
}

async function processTicketPayment(
  session: any,
  phoneNumber: string,
  provider: string
) {
  try {
    const reference = `TKTUSSD${Date.now()}${randomBytes(3).toString("hex")}`.substring(0, 32);
    const dummyEmail = `${phoneNumber.replace(/[^0-9]/g, "")}@ussd.pawavotes.com`;

    await TicketOrder.create({
      reference,
      eventId: session.data.eventId,
      eventTitle: session.data.eventTitle,
      eventDate: session.data.eventDate,
      eventTime: session.data.eventTime,
      venueName: session.data.venueName,
      venueAddress: session.data.venueAddress,
      ticketTypeId: session.data.ticketTypeId,
      ticketTypeName: session.data.ticketTypeName,
      ticketTypeColor: session.data.ticketTypeColor || "#10b981",
      ticketBg: session.data.ticketBg || "",
      ticketTextColor: session.data.ticketTextColor || "light",
      quantity: session.data.quantity,
      unitPrice: session.data.ticketTypePrice,
      totalAmount: session.data.totalAmount,
      buyerName: session.data.buyerName,
      buyerEmail: dummyEmail,
      buyerPhone: phoneNumber,
      status: "pending",
    });

    session.data.paymentReference = reference;
    session.markModified("data");
    session.isActive = false;

    const shortRef = reference.substring(7, 20);

    setTimeout(async () => {
      try {
        const hubtelRes = await initiateHubtelCharge(
          dummyEmail,
          session.data.totalAmount,
          phoneNumber,
          reference,
          provider
        );

        if (!hubtelRes.success) {
          await TicketOrder.findOneAndUpdate({ reference }, { status: "failed" });
          return;
        }

        setTimeout(async () => {
          try {
            const order = await TicketOrder.findOne({ reference });
            if (!order || order.status !== "pending") return;
            await checkAndCompleteTicketOrder(reference);
          } catch (e) {
            console.error(`[${reference}] Ticket status check error:`, e);
          }
        }, 5 * 60 * 1000);
      } catch (error: any) {
        console.error(`[${reference}] Hubtel ticket charge error:`, error);
        await TicketOrder.findOneAndUpdate({ reference }, { status: "failed" });
      }
    }, 4000);

    return {
      message: compressMessage(
        `Payment request sent!\nRef: ${shortRef}\n\nTicket: ${truncateName(session.data.ticketTypeName, 15)} x${session.data.quantity}\nAmount: GHS ${session.data.totalAmount.toFixed(2)}\n\nApprove on your phone.\nThank you!`
      ),
      continueSession: false,
    };
  } catch (error: any) {
    console.error("[USSD Tickets] processTicketPayment error:", error);
    return { message: "Error processing payment. Please try again.", continueSession: false };
  }
}

async function initiateHubtelCharge(
  email: string,
  amount: number,
  phoneNumber: string,
  reference: string,
  provider: string
) {
  try {
    const hubtelApiId = process.env.HUBTEL_API_ID;
    const hubtelApiKey = process.env.HUBTEL_API_KEY;
    const hubtelMerchantAccount = process.env.HUBTEL_MERCHANT_ACCOUNT;
    const callbackUrl =
      process.env.HUBTEL_CALLBACK_URL ||
      `${process.env.NEXT_PUBLIC_API_URL}/api/webhooks/hubtel`;

    if (!hubtelApiId || !hubtelApiKey || !hubtelMerchantAccount) {
      return { success: false, error: "Payment not configured" };
    }

    let phone = phoneNumber.replace(/[\s\-+]/g, "");
    if (phone.startsWith("0")) phone = "233" + phone.substring(1);
    else if (!phone.startsWith("233")) phone = "233" + phone;

    const channelMap: Record<string, string> = {
      mtn: "mtn-gh",
      vod: "vodafone-gh",
      tgo: "tigo-gh",
    };

    const payload = {
      CustomerName: session_safe_name(email),
      CustomerMsisdn: phone,
      CustomerEmail: email,
      Channel: channelMap[provider] || "mtn-gh",
      Amount: amount,
      PrimaryCallbackUrl: callbackUrl,
      Description: `Ticket purchase - ${reference}`,
      ClientReference: reference,
    };

    const base64Auth = Buffer.from(`${hubtelApiId}:${hubtelApiKey}`).toString("base64");
    const res = await fetch(
      `https://rmp.hubtel.com/merchantaccount/merchants/${hubtelMerchantAccount}/receive/mobilemoney`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${base64Auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.Message || "Payment service error", data };
    }

    const isSuccess = data.ResponseCode === "0001" || data.ResponseCode === "0000";
    return { success: isSuccess, data };
  } catch (error: any) {
    console.error("[USSD Tickets] Hubtel charge error:", error);
    return { success: false, error: error.message };
  }
}

function session_safe_name(email: string): string {
  return email.split("@")[0] || "Customer";
}

async function checkAndCompleteTicketOrder(clientReference: string) {
  try {
    const hubtelApiId = process.env.HUBTEL_API_ID;
    const hubtelApiKey = process.env.HUBTEL_API_KEY;
    const hubtelPrepaidDepositId = process.env.HUBTEL_PREPAID_DEPOSIT_ID;

    if (!hubtelApiId || !hubtelApiKey || !hubtelPrepaidDepositId) return;

    const base64Auth = Buffer.from(`${hubtelApiId}:${hubtelApiKey}`).toString("base64");
    const statusUrl = `https://smrsc.hubtel.com/api/merchants/${hubtelPrepaidDepositId}/transactions/status?clientReference=${clientReference}`;

    const res = await fetch(statusUrl, {
      method: "GET",
      headers: { Authorization: `Basic ${base64Auth}` },
    });
    const data = await res.json();
    if (!res.ok) return;

    if (
      data.ResponseCode === "success" &&
      data.Data?.transactionStatus === "success"
    ) {
      const order = await TicketOrder.findOne({ reference: clientReference });
      if (!order || order.status !== "pending") return;

      const ticketCodes = Array.from({ length: order.quantity }, (_, i) =>
        `${clientReference.slice(-8)}-${i + 1}-${randomBytes(3)
          .toString("hex")
          .toUpperCase()}`
      );

      await TicketOrder.findOneAndUpdate(
        { reference: clientReference },
        { status: "completed", ticketCodes, paymentData: data.Data }
      );

      await EventModel.findOneAndUpdate(
        { _id: order.eventId, "ticketTypes.id": order.ticketTypeId },
        {
          $inc: {
            "ticketTypes.$.sold": order.quantity,
            totalSold: order.quantity,
          },
        }
      );

      // Skip generated USSD placeholder addresses
      if (!order.buyerEmail.endsWith('@ussd.pawavotes.com')) sendTicketConfirmationEmail({
        buyerName: order.buyerName,
        buyerEmail: order.buyerEmail,
        eventTitle: order.eventTitle,
        ticketTypeName: order.ticketTypeName,
        ticketTypeColor: order.ticketTypeColor,
        quantity: order.quantity,
        unitPrice: order.unitPrice,
        totalAmount: order.totalAmount,
        ticketCodes,
        eventDate: order.eventDate || "",
        eventTime: order.eventTime || "",
        venueName: order.venueName || "",
        venueAddress: order.venueAddress || "",
        reference: clientReference,
      }).catch(() => {});

      if (order.buyerPhone) {
        sendTicketSmsConfirmation(
          order.buyerPhone,
          order.buyerName,
          order.eventTitle,
          order.ticketTypeName,
          order.quantity,
          clientReference,
        ).catch(() => {});
      }
    } else if (data.Data?.transactionStatus === "failed") {
      await TicketOrder.findOneAndUpdate(
        { reference: clientReference },
        { status: "failed", paymentData: data.Data }
      );
    }
  } catch (error: any) {
    console.error("[USSD Tickets] checkAndCompleteTicketOrder error:", error);
  }
}
