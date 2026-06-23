import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import connectDB from "@/lib/mongodb";
import UssdSession from "@/models/UssdSession";
import Award from "@/models/Award";
import Category from "@/models/Category";
import Nominee from "@/models/Nominee";
import Vote from "@/models/Vote";
import PendingVote from "@/models/PendingVote";
import EventModel from "@/models/Event";
import TicketOrder from "@/models/TicketOrder";
import { sendTicketConfirmationEmail } from "@/lib/email";
import { sendTicketSmsConfirmation } from "@/services/sms.service";

const MAX_MESSAGE_LENGTH = 182;
const MAX_ERROR_COUNT = 3;
const SESSION_TIMEOUT_MS = 15 * 60 * 1000;
const ITEMS_PER_PAGE = 5;
const MIN_VOTES = 1;
const MAX_VOTES = 1000;
const HIGH_VOTE_THRESHOLD = 100;
const MAX_TICKET_QTY = 10;


function getNavigationText(step: string): string {
  if (step === "welcome") {
    return "0. Exit";
  }
  return "0. Back";
}

function compressMessage(text: string, maxLength = MAX_MESSAGE_LENGTH): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;

  text = text
    .replace(/Ghana Cedis/g, "GHS")
    .replace(/Enter number of/g, "Enter")
    .replace(/Select (\w+):/g, "$1:")
    .replace(/\n\n\n/g, "\n\n")
    .replace(/ {2,}/g, " ");

  if (text.length > maxLength) {
    text = text.substring(0, maxLength - 3) + "...";
  }

  return text;
}

function truncateName(name: string, maxLength: number): string {
  if (!name) return "";
  if (name.length <= maxLength) return name;
  return name.substring(0, maxLength - 3) + "...";
}

function handleError(
  session: any,
  message: string,
  continueSession: boolean = true,
) {
  session.data.errorCount = (session.data.errorCount || 0) + 1;

  if (session.data.errorCount > MAX_ERROR_COUNT) {
    return {
      message: "Too many errors. Please dial again to restart.",
      continueSession: false,
    };
  }

  return {
    message: compressMessage(
      `${message}\n\n${getNavigationText(session.currentStep)}`,
    ),
    continueSession,
  };
}

function detectMobileProvider(phoneNumber: string): string | null {
  const cleanNumber = phoneNumber.replace(/[\s\-+]/g, "");
  let prefix = "";

  if (cleanNumber.startsWith("233")) {
    prefix = cleanNumber.substring(3, 5);
  } else if (cleanNumber.startsWith("0")) {
    prefix = cleanNumber.substring(1, 3);
  } else {
    prefix = cleanNumber.substring(0, 2);
  }

  const mtnPrefixes = ["24", "25", "53", "54", "55", "59", "23", "28"];
  const telecelPrefixes = ["20", "50"];
  const airtelTigoPrefixes = ["26", "27", "56", "57"];

  if (mtnPrefixes.includes(prefix)) return "mtn";
  if (telecelPrefixes.includes(prefix)) return "vod";
  if (airtelTigoPrefixes.includes(prefix)) return "tgo";

  console.warn(`Unknown network prefix: ${prefix} for ${phoneNumber}`);
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

    const arkeselResponse = {
      sessionID: sessionId,
      userID: userID || "CP9VG7Y5TN_dNri2",
      msisdn: phoneNumber,
      message: response.message,
      continueSession: response.continueSession,
    };

    return NextResponse.json(arkeselResponse);
  } catch (error: any) {
    console.error("USSD POST error:", error);
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
  phoneNumber: string,
) {
  const step = session.currentStep;
  const sessionAge = Date.now() - new Date(session.lastActivity).getTime();
  if (sessionAge > SESSION_TIMEOUT_MS && step !== "welcome") {
    return {
      message: "Session expired. Please dial again to continue.",
      continueSession: false,
    };
  }
  if (userInput === "#") {
    return handleNextPage(session);
  }
  if (userInput === "0") {
    if (session.data.currentPage && session.data.currentPage > 1) {
      return handlePreviousPage(session);
    } else if (step === "welcome") {
      return {
        message: "Thank you for using PawaVotes!",
        continueSession: false,
      };
    } else {
      return handleBackNavigation(session);
    }
  }

  if (userInput === "00") {
    return {
      message: "Thank you for using PawaVotes!",
      continueSession: false,
    };
  }

  switch (step) {
    case "welcome":
      return await showWelcome(session, userInput);
    case "quick_vote_code":
      return await handleQuickVoteCode(session, userInput);
    case "select_award":
      return await handleAwardSelection(session, userInput);
    case "select_category":
      return await handleCategorySelection(session, userInput);
    case "nominee_method":
      return await handleNomineeMethod(session, userInput);
    case "enter_nominee_code":
      return await handleNomineeCodeEntry(session, userInput);
    case "select_nominee":
      return await handleNomineeSelection(session, userInput);
    case "enter_votes":
      return await handleVoteQuantity(session, userInput);
    case "confirm_high_vote":
      return await handleHighVoteConfirmation(session, userInput);
    case "confirm":
      return await handleConfirmation(session, userInput, phoneNumber);
    case "confirm_network":
      return await handleNetworkConfirmation(session, userInput, phoneNumber);
    case "enter_payment_otp":
      return await handlePaymentOTP(session, userInput);
    // ── Ticket purchase steps ──
    case "select_ticket_event":
      return await handleTicketEventSelection(session, userInput);
    case "select_ticket_type":
      return await handleTicketTypeSelection(session, userInput);
    case "enter_ticket_qty":
      return await handleTicketQtyInput(session, userInput);
    case "enter_ticket_name":
      return await handleTicketNameInput(session, userInput);
    case "confirm_ticket":
      return await handleTicketConfirmation(session, userInput, phoneNumber);
    case "confirm_ticket_network":
      return await handleTicketNetworkConfirmation(session, userInput, phoneNumber);
    default:
      return {
        message: "Invalid session. Please try again.",
        continueSession: false,
      };
  }
}


function handleBackNavigation(session: any) {

  const stepFlow: { [key: string]: string } = {
    select_award: "welcome",
    quick_vote_code: "welcome",
    select_category: "select_award",
    nominee_method: "select_category",
    enter_nominee_code: "nominee_method",
    select_nominee: "nominee_method",
    enter_votes: "nominee_method",
    confirm: "enter_votes",
    confirm_network: "confirm",
    enter_payment_otp: "confirm",
    // ticket steps
    select_ticket_event: "welcome",
    select_ticket_type: "select_ticket_event",
    enter_ticket_qty: "select_ticket_type",
    enter_ticket_name: "enter_ticket_qty",
    confirm_ticket: "enter_ticket_name",
    confirm_ticket_network: "confirm_ticket",
  };

  const previousStep = stepFlow[session.currentStep];

  if (!previousStep) {
    return { message: "Cannot go back from here.", continueSession: false };
  }

  session.data.errorCount = 0;
  session.currentStep = previousStep;
  session.data.currentPage = 1;

  switch (previousStep) {
    case "welcome":
      return showWelcome(session, "");

    case "select_award":
      return showAwardMenu(session);

    case "select_category":
      return showCategoryMenu(session);

    case "nominee_method": {
      return {
        message: compressMessage(
          `${session.data.categoryName}\n\nVoting Method:\n\n1. Enter Nominee Code\n2. Browse Nominees\n\n${getNavigationText("nominee_method")}`,
        ),
        continueSession: true,
      };
    }

    case "enter_votes": {
      const pricePerVote = session.data.awardCache?.pricing?.votingCost || 0.5;
      const displayName = truncateName(session.data.nomineeName, 25);
      const codeDisplay = session.data.nomineeCode
        ? ` (${session.data.nomineeCode})`
        : "";
      return {
        message: compressMessage(
          `Vote: ${displayName}${codeDisplay}\nGHS ${pricePerVote.toFixed(2)}/vote\n\nVotes:\n\n${getNavigationText("enter_votes")}`,
        ),
        continueSession: true,
      };
    }

    case "select_ticket_event":
      return showTicketEventMenu(session);

    case "select_ticket_type":
      return showTicketTypeMenu(session);

    case "enter_ticket_qty": {
      const price = session.data.tkt_typePrice || 0;
      const priceStr = price === 0 ? "Free" : `GHS ${price.toFixed(2)}`;
      return {
        message: compressMessage(
          `${truncateName(session.data.tkt_typeName, 22)}\n${priceStr}/ticket\n\nQty (1-${session.data.tkt_maxQty || MAX_TICKET_QTY}):\n\n${getNavigationText("enter_ticket_qty")}`,
        ),
        continueSession: true,
      };
    }

    case "enter_ticket_name":
      return {
        message: compressMessage(
          `Qty: ${session.data.tkt_qty} ticket(s)\n\nEnter your full name:\n\n${getNavigationText("enter_ticket_name")}`,
        ),
        continueSession: true,
      };

    default:
      return { message: "Error navigating back.", continueSession: false };
  }
}

function handleNextPage(session: any) {
  const currentPage = session.data.currentPage || 1;
  const totalPages = session.data.totalPages || 1;

  if (currentPage >= totalPages) {
    return {
      message:
        "You are on the last page. Please select an option or press 0 to go back.",
      continueSession: true,
    };
  }

  session.data.currentPage = currentPage + 1;

  switch (session.currentStep) {
    case "select_award":
      return showAwardMenu(session);
    case "select_category":
      return showCategoryMenu(session);
    case "select_nominee":
      return showNomineeMenu(session);
    case "select_ticket_event":
      return showTicketEventMenu(session);
    case "select_ticket_type":
      return showTicketTypeMenu(session);
    default:
      return {
        message: "Pagination not available on this screen.",
        continueSession: true,
      };
  }
}

function handlePreviousPage(session: any) {
  const currentPage = session.data.currentPage || 1;

  if (currentPage <= 1) {
    return {
      message: "You are on the first page. Please select an option.",
      continueSession: true,
    };
  }

  session.data.currentPage = currentPage - 1;

  switch (session.currentStep) {
    case "select_award":
      return showAwardMenu(session);
    case "select_category":
      return showCategoryMenu(session);
    case "select_nominee":
      return showNomineeMenu(session);
    case "select_ticket_event":
      return showTicketEventMenu(session);
    case "select_ticket_type":
      return showTicketTypeMenu(session);
    default:
      return {
        message: "Pagination not available on this screen.",
        continueSession: true,
      };
  }
}

function showAwardMenu(session: any) {
  const awards = session.data.awards || [];
  const itemsPerPage = ITEMS_PER_PAGE;
  const currentPage = session.data.currentPage || 1;
  const totalPages = Math.ceil(awards.length / itemsPerPage);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageAwards = awards.slice(startIndex, endIndex);

  if (pageAwards.length === 0) {
    return { message: "No awards available.", continueSession: false };
  }

  let menu = `Select Event (${currentPage}/${totalPages}):\n\n`;
  pageAwards.forEach((award: any, index: number) => {
    menu += `${index + 1}. ${truncateName(award.name, 30)}\n`;
  });

  if (currentPage < totalPages) {
    menu += `\n${itemsPerPage + 1}. Next Page`;
  }
  menu += `\n\n${getNavigationText("select_award")}`;

  session.data.totalPages = totalPages;
  session.data.pageStartIndex = startIndex;

  return { message: compressMessage(menu), continueSession: true };
}

function showCategoryMenu(session: any) {
  const categories = session.data.categories || [];
  const itemsPerPage = ITEMS_PER_PAGE;
  const currentPage = session.data.currentPage || 1;
  const totalPages = Math.ceil(categories.length / itemsPerPage);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageCategories = categories.slice(startIndex, endIndex);

  if (pageCategories.length === 0) {
    return { message: "No categories available.", continueSession: false };
  }

  const awardName = truncateName(session.data.awardName, 25);
  let menu = `${awardName} (${currentPage}/${totalPages})\n\nCategory:\n\n`;
  pageCategories.forEach((category: any, index: number) => {
    menu += `${index + 1}. ${truncateName(category.name, 28)}\n`;
  });

  if (currentPage < totalPages) {
    menu += `\n${itemsPerPage + 1}. Next Page`;
  }
  menu += `\n\n${getNavigationText("select_category")}`;

  session.data.totalPages = totalPages;
  session.data.pageStartIndex = startIndex;

  return { message: compressMessage(menu), continueSession: true };
}

function showNomineeMenu(session: any) {
  const nominees = session.data.nominees || [];
  const itemsPerPage = ITEMS_PER_PAGE;
  const currentPage = session.data.currentPage || 1;
  const totalPages = Math.ceil(nominees.length / itemsPerPage);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageNominees = nominees.slice(startIndex, endIndex);

  if (pageNominees.length === 0) {
    return { message: "No nominees available.", continueSession: false };
  }

  const catName = truncateName(session.data.categoryName, 25);
  let menu = `${catName} (${currentPage}/${totalPages})\n\nNominee:\n\n`;
  pageNominees.forEach((nominee: any, index: number) => {
    const code = nominee.nomineeCode ? ` (${nominee.nomineeCode})` : "";
    menu += `${index + 1}. ${truncateName(nominee.name, 22)}${code}\n`;
  });

  if (currentPage < totalPages) {
    menu += `\n${itemsPerPage + 1}. Next Page`;
  }
  menu += `\n\n${getNavigationText("select_nominee")}`;

  session.data.totalPages = totalPages;
  session.data.pageStartIndex = startIndex;

  return { message: compressMessage(menu), continueSession: true };
}

const WELCOME_MENU = `Welcome to PawaVotes\n\n1. Vote\n2. Quick Vote (Code)\n3. Purchase Tickets\n\n${getNavigationText("welcome")}`;

async function showWelcome(session: any, userInput?: string) {
  // ── Always show the menu first — options 1/2/3 are only acted on when chosen ──

  // Initial dial or unrecognised input → just show the menu
  if (!userInput || (userInput !== "1" && userInput !== "2" && userInput !== "3")) {
    return {
      message: compressMessage(WELCOME_MENU),
      continueSession: true,
    };
  }

  // Option 2 — Quick Vote by nominee code
  if (userInput === "2") {
    session.currentStep = "quick_vote_code";
    return {
      message: compressMessage(
        `Quick Vote\n\nEnter Nominee Code:\n(e.g., TGMA001)\n\n${getNavigationText("quick_vote_code")}`,
      ),
      continueSession: true,
    };
  }

  // Option 3 — Purchase Tickets (independent of any voting awards)
  if (userInput === "3") {
    const now = new Date();
    const ticketEvents = await EventModel.find({
      status: { $in: ["published", "ongoing"] },
      "settings.isPublic": true,
      endDate: { $gte: now },
    })
      .select("_id title startDate startTime venue ticketTypes code ticketBg ticketTextColor")
      .lean();

    const available = ticketEvents.filter((ev: any) =>
      ev.ticketTypes?.some((tt: any) => tt.capacity - tt.sold > 0)
    );

    if (available.length === 0) {
      return {
        message: compressMessage(
          `No events with available tickets right now.\n\n${compressMessage(WELCOME_MENU)}`,
        ),
        continueSession: true,
      };
    }

    session.data.tkt_events = available;
    session.data.currentPage = 1;
    session.markModified("data");
    session.currentStep = "select_ticket_event";
    return showTicketEventMenu(session);
  }

  // Option 1 — Vote (only here do we check for active awards)
  const awards = await Award.find({ status: { $in: ["published", "active"] } })
    .select("name status votingStartDate votingEndDate votingStartTime votingEndTime settings pricing")
    .lean();

  const now = new Date();
  const activeAwards: any[] = [];

  for (const award of awards) {
    let isActive = false;
    if (award.votingStartDate && award.votingEndDate) {
      const start = new Date(award.votingStartDate);
      const end = new Date(award.votingEndDate);
      if (award.votingStartTime) {
        const [h, m] = award.votingStartTime.split(":");
        start.setHours(parseInt(h), parseInt(m), 0, 0);
      } else {
        start.setHours(0, 0, 0, 0);
      }
      if (award.votingEndTime) {
        const [h, m] = award.votingEndTime.split(":");
        end.setHours(parseInt(h), parseInt(m), 59, 999);
      } else {
        end.setHours(23, 59, 59, 999);
      }
      isActive = now >= start && now <= end;
    } else {
      isActive = true;
    }
    if (isActive) activeAwards.push(award);
  }

  if (activeAwards.length === 0) {
    // Voting is closed — tell them but keep the session alive so they can pick option 3
    return {
      message: compressMessage(
        `Voting is currently closed.\n\nYou can still purchase tickets:\n\n${compressMessage(WELCOME_MENU)}`,
      ),
      continueSession: true,
    };
  }

  session.data.awards = activeAwards;
  session.data.currentPage = 1;
  if (activeAwards.length === 1) {
    session.data.awardId = activeAwards[0]._id.toString();
    session.data.awardName = activeAwards[0].name;
    session.data.awardCache = {
      pricing: activeAwards[0].pricing,
      votingStartDate: activeAwards[0].votingStartDate,
      votingEndDate: activeAwards[0].votingEndDate,
      votingStartTime: activeAwards[0].votingStartTime,
      votingEndTime: activeAwards[0].votingEndTime,
    };
  }
  session.markModified("data");
  session.currentStep = "select_award";
  return showAwardMenu(session);
}

async function handleQuickVoteCode(session: any, userInput: string) {
  const nomineeCode = userInput
    .trim()
    .toUpperCase()
    .replace(/[-_\s]/g, "");

  const CODE_PATTERN = /^[A-Z0-9]{3,10}$/;
  if (!CODE_PATTERN.test(nomineeCode)) {
    session.data.errorCount = (session.data.errorCount || 0) + 1;
    if (session.data.errorCount > MAX_ERROR_COUNT) {
      return {
        message: "Too many errors. Please dial again to restart.",
        continueSession: false,
      };
    }
    return {
      message: compressMessage(
        `Invalid format\nExample: TGMA001\n\nTry again:\n\n${getNavigationText("quick_vote_code")}`,
      ),
      continueSession: true,
    };
  }

  const nominee = await Nominee.findOne({
    nomineeCode,
    status: "published",
    nominationStatus: "accepted",
  })
    .select("name _id categoryId")
    .lean();

  if (!nominee) {
    session.data.errorCount = (session.data.errorCount || 0) + 1;
    if (session.data.errorCount > MAX_ERROR_COUNT) {
      return {
        message: "Too many errors. Please dial again to restart.",
        continueSession: false,
      };
    }
    return {
      message: compressMessage(
        `Code "${nomineeCode}" not found\n\nTry again:\n\n${getNavigationText("quick_vote_code")}`,
      ),
      continueSession: true,
    };
  }

  const category = await Category.findById(nominee.categoryId)
    .select("name awardId")
    .lean();

  if (!category) {
    return {
      message: "Category not found. Please try again.",
      continueSession: false,
    };
  }

  const award = await Award.findById(category.awardId)
    .select(
      "name pricing votingStartDate votingEndDate votingStartTime votingEndTime",
    )
    .lean();

  if (!award) {
    return {
      message: "Event not found. Please try again.",
      continueSession: false,
    };
  }

  session.data.awardId = category.awardId.toString();
  session.data.awardName = award.name;
  session.data.categoryId = nominee.categoryId.toString();
  session.data.categoryName = category.name;
  session.data.nomineeId = nominee._id.toString();
  session.data.nomineeName = nominee.name;
  session.data.nomineeCode = nomineeCode;
  session.data.errorCount = 0;
  session.data.awardCache = {
    pricing: award.pricing,
    votingStartDate: award.votingStartDate,
    votingEndDate: award.votingEndDate,
    votingStartTime: award.votingStartTime,
    votingEndTime: award.votingEndTime,
  };
  session.markModified('data');

  const pricePerVote = award?.pricing?.votingCost || 0.5;
  session.currentStep = "enter_votes";

  const displayName = truncateName(nominee.name, 25);
  return {
    message: compressMessage(
      `Vote: ${displayName} (${nomineeCode})\nGHS ${pricePerVote.toFixed(2)}/vote\n\nVotes:\n\n${getNavigationText("enter_votes")}`,
    ),
    continueSession: true,
  };
}

async function handleAwardSelection(session: any, userInput: string) {
  const awards = session.data?.awards;

  if (!awards || !Array.isArray(awards) || awards.length === 0) {
    return {
      message: "Session expired. Please dial the code again to start over.",
      continueSession: false,
    };
  }

  const selectedIndex = parseInt(userInput) - 1;
  const pageStartIndex = session.data.pageStartIndex || 0;
  const actualIndex = pageStartIndex + selectedIndex;
  const itemsPerPage = ITEMS_PER_PAGE;

  if (
    isNaN(selectedIndex) ||
    selectedIndex < 0 ||
    selectedIndex >= itemsPerPage ||
    actualIndex >= awards.length
  ) {
    return handleError(
      session,
      `Invalid selection. Enter 1-${Math.min(itemsPerPage, awards.length - pageStartIndex)}`,
    );
  }

  const selectedAward = awards[actualIndex];

  session.data.awardId = selectedAward._id.toString();
  session.data.awardName = selectedAward.name;
  session.data.currentPage = 1;
  session.data.errorCount = 0;
  session.data.awardCache = {
    pricing: selectedAward.pricing,
    votingStartDate: selectedAward.votingStartDate,
    votingEndDate: selectedAward.votingEndDate,
    votingStartTime: selectedAward.votingStartTime,
    votingEndTime: selectedAward.votingEndTime,
  };
  session.markModified('data');

  const categories = await Category.find({
    awardId: selectedAward._id,
    isPublished: true,
  })
    .select("name")
    .lean();

  if (!categories || categories.length === 0) {
    return {
      message:
        "No categories are available for this event. Please contact the organizer.",
      continueSession: false,
    };
  }

  session.currentStep = "select_category";
  session.data.categories = categories;
  session.markModified('data');

  return showCategoryMenu(session);
}

async function handleCategorySelection(session: any, userInput: string) {
  const selectedIndex = parseInt(userInput) - 1;
  const categories = session.data.categories;
  const pageStartIndex = session.data.pageStartIndex || 0;
  const actualIndex = pageStartIndex + selectedIndex;
  const itemsPerPage = ITEMS_PER_PAGE;

  if (
    !categories ||
    !Array.isArray(categories) ||
    isNaN(selectedIndex) ||
    selectedIndex < 0 ||
    selectedIndex >= itemsPerPage ||
    actualIndex >= categories.length
  ) {
    return handleError(
      session,
      `Invalid selection. Enter 1-${Math.min(itemsPerPage, (categories?.length || 0) - pageStartIndex)}`,
    );
  }

  const selectedCategory = categories[actualIndex];
  session.data.categoryId = selectedCategory._id.toString();
  session.data.categoryName = selectedCategory.name;
  session.data.currentPage = 1;
  session.data.errorCount = 0;
  session.markModified('data');

  session.currentStep = "nominee_method";

  return {
    message: compressMessage(
      `${truncateName(selectedCategory.name, 30)}\n\nVoting Method:\n\n1. Enter Nominee Code\n2. Browse Nominees\n\n${getNavigationText("nominee_method")}`,
    ),
    continueSession: true,
  };
}

async function handleNomineeMethod(session: any, userInput: string) {
  if (userInput === "1") {
    session.currentStep = "enter_nominee_code";
    return {
      message: compressMessage(
        `Enter Nominee Code\n(e.g., TGMA001):\n\n${getNavigationText("enter_nominee_code")}`,
      ),
      continueSession: true,
    };
  } else if (userInput === "2") {
    const nominees = await Nominee.find({
      categoryId: session.data.categoryId,
      status: "published",
      nominationStatus: "accepted",
    })
      .select("name nomineeCode")
      .lean();

    if (nominees.length === 0) {
      return {
        message: "No nominees are available for this category at the moment.",
        continueSession: false,
      };
    }

    session.currentStep = "select_nominee";
    session.data.nominees = nominees;
    session.data.currentPage = 1;
    session.markModified('data');

    return showNomineeMenu(session);
  } else {
    return handleError(session, "Invalid selection. Enter 1 or 2");
  }
}

async function handleNomineeCodeEntry(session: any, userInput: string) {
  const nomineeCode = userInput
    .trim()
    .toUpperCase()
    .replace(/[-_\s]/g, "");

  const CODE_PATTERN = /^[A-Z0-9]{3,10}$/;
  if (!CODE_PATTERN.test(nomineeCode)) {
    return handleError(
      session,
      `Invalid format\nExample: TGMA001\n\nTry again:`,
    );
  }

  const nominee = await Nominee.findOne({
    nomineeCode,
    categoryId: session.data.categoryId,
    status: "published",
    nominationStatus: "accepted",
  })
    .select("name _id")
    .lean();

  if (!nominee) {
    return handleError(
      session,
      `Code "${nomineeCode}" not found\n\nTry again:`,
    );
  }

  session.data.nomineeId = nominee._id.toString();
  session.data.nomineeName = nominee.name;
  session.data.nomineeCode = nomineeCode;
  session.data.errorCount = 0;
  session.markModified('data');

  const pricePerVote = session.data.awardCache?.pricing?.votingCost || 0.5;
  session.currentStep = "enter_votes";

  const displayName = truncateName(nominee.name, 25);
  return {
    message: compressMessage(
      `Vote: ${displayName} (${nomineeCode})\nGHS ${pricePerVote.toFixed(2)}/vote\n\nVotes:\n\n${getNavigationText("enter_votes")}`,
    ),
    continueSession: true,
  };
}

async function handleNomineeSelection(session: any, userInput: string) {
  const selectedIndex = parseInt(userInput) - 1;
  const nominees = session.data.nominees;
  const pageStartIndex = session.data.pageStartIndex || 0;
  const actualIndex = pageStartIndex + selectedIndex;
  const itemsPerPage = ITEMS_PER_PAGE;

  if (
    isNaN(selectedIndex) ||
    selectedIndex < 0 ||
    selectedIndex >= itemsPerPage ||
    actualIndex >= nominees.length
  ) {
    return handleError(
      session,
      `Invalid selection. Enter 1-${Math.min(itemsPerPage, nominees.length - pageStartIndex)}`,
    );
  }

  const selectedNominee = nominees[actualIndex];
  session.data.nomineeId = selectedNominee._id.toString();
  session.data.nomineeName = selectedNominee.name;
  session.data.nomineeCode = selectedNominee.nomineeCode;
  session.data.errorCount = 0;
  session.markModified('data');

  const pricePerVote = session.data.awardCache?.pricing?.votingCost || 0.5;
  session.currentStep = "enter_votes";

  const displayName = truncateName(selectedNominee.name, 25);
  const codeDisplay = selectedNominee.nomineeCode
    ? ` (${selectedNominee.nomineeCode})`
    : "";

  return {
    message: compressMessage(
      `Vote: ${displayName}${codeDisplay}\nGHS ${pricePerVote.toFixed(2)}/vote\n\nVotes:\n\n${getNavigationText("enter_votes")}`,
    ),
    continueSession: true,
  };
}

async function handleVoteQuantity(session: any, userInput: string) {
  const numberOfVotes = parseInt(userInput);

  if (isNaN(numberOfVotes) || numberOfVotes < MIN_VOTES) {
    return handleError(
      session,
      `Invalid amount. Enter ${MIN_VOTES}-${MAX_VOTES} votes`,
    );
  }

  if (numberOfVotes > MAX_VOTES) {
    return handleError(session, `Maximum ${MAX_VOTES} votes per transaction`);
  }

  const pricePerVote = session.data.awardCache?.pricing?.votingCost || 0.5;
  const amount = numberOfVotes * pricePerVote;

  session.data.numberOfVotes = numberOfVotes;
  session.data.amount = amount;
  session.data.errorCount = 0;
  session.markModified('data');
  session.currentStep = "confirm";

  const displayName = truncateName(session.data.nomineeName, 22);
  const codeDisplay = session.data.nomineeCode
    ? ` (${session.data.nomineeCode})`
    : "";

  return {
    message: compressMessage(
      `Confirm Vote\n\nNominee: ${displayName}${codeDisplay}\nVotes: ${numberOfVotes}\nTotal: GHS ${amount.toFixed(2)}\n\n1. Pay\n2. Cancel`,
    ),
    continueSession: true,
  };
}

async function handleHighVoteConfirmation(session: any, userInput: string) {
  if (userInput === "1") {
    const numberOfVotes = session.data.tempVotes;
    const pricePerVote = session.data.awardCache?.pricing?.votingCost || 0.5;
    const amount = numberOfVotes * pricePerVote;

    session.data.numberOfVotes = numberOfVotes;
    session.data.amount = amount;
    session.data.confirmedHighVote = false;
    session.data.tempVotes = null;
    session.markModified('data');
    session.currentStep = "confirm";

    const displayName = truncateName(session.data.nomineeName, 22);
    const codeDisplay = session.data.nomineeCode
      ? ` (${session.data.nomineeCode})`
      : "";

    return {
      message: compressMessage(
        `Confirm Vote\n\nNominee: ${displayName}${codeDisplay}\nVotes: ${numberOfVotes}\nTotal: GHS ${amount.toFixed(2)}\n\n1. Pay\n2. Cancel`,
      ),
      continueSession: true,
    };
  } else {
    session.data.confirmedHighVote = false;
    session.data.tempVotes = null;
    session.markModified('data');
    session.currentStep = "enter_votes";

    const pricePerVote = session.data.awardCache?.pricing?.votingCost || 0.5;
    const displayName = truncateName(session.data.nomineeName, 25);
    const codeDisplay = session.data.nomineeCode
      ? ` (${session.data.nomineeCode})`
      : "";

    return {
      message: compressMessage(
        `Vote: ${displayName}${codeDisplay}\nGHS ${pricePerVote.toFixed(2)}/vote\n\nVotes:\n\n${getNavigationText("enter_votes")}`,
      ),
      continueSession: true,
    };
  }
}

async function handleConfirmation(
  session: any,
  userInput: string,
  phoneNumber: string,
) {
  if (userInput === "2") {
    session.isActive = false;
    return {
      message: "Vote cancelled. Thank you for using PawaVotes.",
      continueSession: false,
    };
  }
  if (userInput !== "1") {
    return {
      message: "Invalid selection. Please enter 1 or 2.",
      continueSession: false,
    };
  }

  try {
    const award = await Award.findById(session.data.awardId)
      .select("votingStartDate votingEndDate votingStartTime votingEndTime")
      .lean();

    if (!award) {
      return {
        message: "Event not found. Please try again.",
        continueSession: false,
      };
    }

    const now = new Date();
    let isVotingOpen = false;

    try {
      const Stage = (await import("@/models/Stage")).default;
      const activeStage = await Stage.findOne({
        awardId: session.data.awardId,
        status: "active",
        stageType: "voting",
      })
        .select("startDate endDate startTime endTime")
        .lean();

      if (activeStage) {
        const stageStart = new Date(activeStage.startDate);
        const stageEnd = new Date(activeStage.endDate);

        if (activeStage.startTime) {
          const [h, m] = activeStage.startTime.split(":");
          stageStart.setHours(parseInt(h), parseInt(m), 0, 0);
        } else {
          stageStart.setHours(0, 0, 0, 0);
        }

        if (activeStage.endTime) {
          const [h, m] = activeStage.endTime.split(":");
          stageEnd.setHours(parseInt(h), parseInt(m), 59, 999);
        } else {
          stageEnd.setHours(23, 59, 59, 999);
        }

        isVotingOpen = now >= stageStart && now <= stageEnd;
      } else {
        isVotingOpen = checkAwardVotingWindow(award, now);
      }
    } catch {
      isVotingOpen = checkAwardVotingWindow(award, now);
    }

    if (!isVotingOpen) {
      session.isActive = false;
      return {
        message:
          "Voting has closed for this event. Your vote was not processed.",
        continueSession: false,
      };
    }

    const detectedProvider = detectMobileProvider(phoneNumber);

    if (!detectedProvider) {
      session.currentStep = "confirm_network";
      return {
        message: `Confirm your network:\n\n1. MTN\n2. Telecel\n3. AirtelTigo\n\n0. Cancel`,
        continueSession: true,
      };
    }

    return await processPayment(session, phoneNumber, detectedProvider);
  } catch (error: any) {
    console.error("handleConfirmation error:", error);
    return {
      message:
        "An error occurred while processing your vote. Please try again.",
      continueSession: false,
    };
  }
}

async function handleNetworkConfirmation(
  session: any,
  userInput: string,
  phoneNumber: string,
) {
  const networkMap: { [key: string]: string } = {
    "1": "mtn",
    "2": "vod",
    "3": "tgo",
  };

  const selectedProvider = networkMap[userInput];

  if (!selectedProvider) {
    return {
      message: "Invalid selection. Please enter 1, 2, or 3.",
      continueSession: false,
    };
  }

  session.data.confirmedNetwork = selectedProvider;
  return await processPayment(session, phoneNumber, selectedProvider);
}

async function handlePaymentOTP(session: any, userInput: string) {
  session.isActive = false;
  return {
    message: "Please approve the payment on your phone to complete your vote.",
    continueSession: false,
  };
}

async function processPayment(
  session: any,
  phoneNumber: string,
  provider: string,
) {
  try {
    const paymentReference = `USSD-${Date.now()}-${randomBytes(6).toString("hex")}`;
    const dummyEmail = `${phoneNumber}@ussd.pawavotes.com`;

    let pendingVote: any;
    try {
      pendingVote = await PendingVote.create({
        reference: paymentReference,
        awardId: session.data.awardId,
        categoryId: session.data.categoryId,
        nomineeId: session.data.nomineeId,
        email: dummyEmail,
        phone: phoneNumber,
        numberOfVotes: session.data.numberOfVotes,
        amount: session.data.amount,
        status: "pending",
      });
    } catch (voteError: any) {
      return {
        message: "Error creating vote record. Please try again.",
        continueSession: false,
      };
    }
    session.data.paymentReference = paymentReference;
    session.markModified('data');
    session.isActive = false;
    
    // const offlineInstructions = getOfflineInstructions(
    //   provider,
    //   session.data.amount,
    // );
    const shortRef = paymentReference.substring(5, 20);
    setTimeout(async () => {
      try {
        const hubtelResponse = await initiateHubtelCharge(
          dummyEmail,
          session.data.amount,
          phoneNumber,
          paymentReference,
          provider,
        );

        if (!hubtelResponse.success) {
          await PendingVote.findByIdAndUpdate(pendingVote._id, { status: "failed" });
          
          const errorMessage = hubtelResponse.error || "Payment initiation failed";
          return;
        }
        
        setTimeout(async () => {
          try {
            const checkPendingVote = await PendingVote.findOne({ reference: paymentReference });
            
            if (!checkPendingVote || checkPendingVote.status !== 'pending') {
              return;
            }
            await checkHubtelTransactionStatus(paymentReference, pendingVote._id);
          } catch (statusError: any) {
            console.error(`[${paymentReference}] Automatic status check error:`, statusError);
          }
        }, 5 * 60 * 1000);
        
      } catch (error: any) {
        console.error(`[${paymentReference}] Error in delayed Hubtel charge:`, error);
        await PendingVote.findByIdAndUpdate(pendingVote._id, { status: "failed" });
      }
    }, 4000);
    const finalMessage = `Payment request sent!\nReference: ${shortRef}\n\nVote: ${truncateName(session.data.nomineeName, 20)}\nAmount: GHS ${session.data.amount.toFixed(2)}\n\nThank you!`;
    
    return {
      message: compressMessage(finalMessage),
      continueSession: false,
    };
  } catch (error: any) {
    console.error("processPayment error:", error);
    return {
      message:
        "An error occurred while processing your vote. Please try again.",
      continueSession: false,
    };
  }
}

async function initiateHubtelCharge(
  email: string,
  amount: number,
  phoneNumber: string,
  reference: string,
  provider: string,
) {
  try {
    const hubtelApiId = process.env.HUBTEL_API_ID;
    const hubtelApiKey = process.env.HUBTEL_API_KEY;
    const hubtelMerchantAccount = process.env.HUBTEL_MERCHANT_ACCOUNT;
    const callbackUrl = process.env.HUBTEL_CALLBACK_URL || `${process.env.NEXT_PUBLIC_API_URL}/api/webhooks/hubtel`;
    
    if (!hubtelApiId || !hubtelApiKey || !hubtelMerchantAccount) {
      return { success: false, error: "Payment configuration error" };
    }
    let formattedPhone = phoneNumber.replace(/[\s\-+]/g, "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "233" + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith("233")) {
      formattedPhone = "233" + formattedPhone;
    }
    const channelMap: { [key: string]: string } = {
      "mtn": "mtn-gh",
      "vod": "vodafone-gh",
      "tgo": "tigo-gh",
    };

    const channel = channelMap[provider] || "mtn-gh";

    const hubtelRequest = {
      CustomerName: email.split("@")[0],
      CustomerMsisdn: formattedPhone,
      CustomerEmail: email,
      Channel: channel,
      Amount: amount,
      PrimaryCallbackUrl: callbackUrl,
      Description: `Vote payment - ${reference}`,
      ClientReference: reference,
    };

    const authString = `${hubtelApiId}:${hubtelApiKey}`;
    const base64Auth = Buffer.from(authString).toString('base64');

    const response = await fetch(
      `https://rmp.hubtel.com/merchantaccount/merchants/${hubtelMerchantAccount}/receive/mobilemoney`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${base64Auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(hubtelRequest),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Hubtel API error:", data);
      return { 
        success: false, 
        error: data.Message || "Payment service error",
        data 
      };
    }
    const isSuccess = data.ResponseCode === "0001" || data.ResponseCode === "0000";

    return { 
      success: isSuccess, 
      data,
      status: data.ResponseCode === "0000" ? "success" : "pending"
    };
  } catch (error: any) {
    console.error("Hubtel charge error:", error);
    return { success: false, error: error.message };
  }
}


function checkAwardVotingWindow(award: any, now: Date): boolean {
  if (!award.votingStartDate || !award.votingEndDate) return true;

  const start = new Date(award.votingStartDate);
  const end = new Date(award.votingEndDate);

  if (award.votingStartTime) {
    const [h, m] = award.votingStartTime.split(":");
    start.setHours(parseInt(h), parseInt(m), 0, 0);
  } else {
    start.setHours(0, 0, 0, 0);
  }

  if (award.votingEndTime) {
    const [h, m] = award.votingEndTime.split(":");
    end.setHours(parseInt(h), parseInt(m), 59, 999);
  } else {
    end.setHours(23, 59, 59, 999);
  }

  return now >= start && now <= end;
}

async function checkHubtelTransactionStatus(clientReference: string, pendingVoteId: any) {
  try {
    const hubtelApiId = process.env.HUBTEL_API_ID;
    const hubtelApiKey = process.env.HUBTEL_API_KEY;
    const hubtelPrepaidDepositId = process.env.HUBTEL_PREPAID_DEPOSIT_ID;

    if (!hubtelApiId || !hubtelApiKey || !hubtelPrepaidDepositId) {
      console.error('Hubtel credentials not configured for status check');
      return { success: false, error: 'Configuration error' };
    }
    const statusUrl = `https://smrsc.hubtel.com/api/merchants/${hubtelPrepaidDepositId}/transactions/status?clientReference=${clientReference}`;

    const authString = `${hubtelApiId}:${hubtelApiKey}`;
    const base64Auth = Buffer.from(authString).toString('base64');

    const response = await fetch(statusUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${base64Auth}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.Message || 'Status check failed', data };
    }
    if (data.ResponseCode === 'success' && data.Data?.transactionStatus === 'success') {
      const pendingVote = await PendingVote.findById(pendingVoteId);

      if (!pendingVote) {
        return { success: false, error: 'Pending vote not found' };
      }

      if (pendingVote.status === 'completed') {
        return { success: true, message: 'Already processed' };
      }
      const voteData = {
        awardId: pendingVote.awardId,
        categoryId: pendingVote.categoryId,
        nomineeId: pendingVote.nomineeId,
        voterEmail: pendingVote.email,
        voterPhone: pendingVote.phone,
        numberOfVotes: pendingVote.numberOfVotes,
        amount: pendingVote.amount,
        paymentReference: clientReference,
        paymentMethod: data.Data?.Channel || 'mobile_money',
        paymentStatus: 'completed' as const,
      };

      await Vote.create(voteData);
      await Nominee.findByIdAndUpdate(pendingVote.nomineeId, {
        $inc: { voteCount: pendingVote.numberOfVotes },
      });
      await Category.findByIdAndUpdate(pendingVote.categoryId, {
        $inc: { voteCount: pendingVote.numberOfVotes },
      });
      await Award.findByIdAndUpdate(pendingVote.awardId, {
        $inc: { totalVotes: pendingVote.numberOfVotes },
      });
      pendingVote.status = 'completed';
      pendingVote.paymentData = data.Data;
      await pendingVote.save();
      return { success: true, data };
    } else if (data.Data?.transactionStatus === 'failed') {
      await PendingVote.findByIdAndUpdate(pendingVoteId, {
        status: 'failed',
        paymentData: data.Data
      });

      return { success: false, status: 'failed', data };
    } else {
      return { success: false, status: 'pending', data };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

function showTicketEventMenu(session: any) {
  const events: any[] = session.data.tkt_events || [];
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
  menu += `\n\n${getNavigationText("select_ticket_event")}`;

  session.data.totalPages = totalPages;
  session.data.pageStartIndex = startIndex;

  return { message: compressMessage(menu), continueSession: true };
}

function showTicketTypeMenu(session: any) {
  const types: any[] = session.data.tkt_types || [];
  const currentPage = session.data.currentPage || 1;
  const totalPages = Math.ceil(types.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageTypes = types.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  if (pageTypes.length === 0) {
    return { message: "No ticket types available for this event.", continueSession: false };
  }

  const eventName = truncateName(session.data.tkt_eventTitle, 22);
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

async function handleTicketEventSelection(session: any, userInput: string) {
  const events: any[] = session.data.tkt_events || [];
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
    .select("title startDate startTime venue ticketTypes code ticketBg ticketTextColor")
    .lean();

  if (!fresh) return handleError(session, "Event not found. Please try again.");

  const availTypes = (fresh.ticketTypes || []).filter(
    (tt: any) => tt.capacity - tt.sold > 0
  );
  if (availTypes.length === 0) {
    return handleError(session, "This event is sold out. Please choose another.");
  }

  const venueName = fresh.venue?.isVirtual ? "Virtual Event" : (fresh.venue?.name || "TBD");
  const venueAddress = fresh.venue?.isVirtual
    ? (fresh.venue?.virtualLink || "")
    : [fresh.venue?.address, fresh.venue?.city, fresh.venue?.country].filter(Boolean).join(", ");

  session.data.tkt_eventId = fresh._id.toString();
  session.data.tkt_eventTitle = fresh.title;
  session.data.tkt_eventCode = fresh.code;
  session.data.tkt_eventDate = fresh.startDate?.toISOString() || "";
  session.data.tkt_eventTime = fresh.startTime || "";
  session.data.tkt_venueName = venueName;
  session.data.tkt_venueAddress = venueAddress;
  session.data.tkt_ticketBg = fresh.ticketBg || "";
  session.data.tkt_ticketTextColor = fresh.ticketTextColor || "light";
  session.data.tkt_types = availTypes;
  session.data.currentPage = 1;
  session.data.errorCount = 0;
  session.markModified("data");

  session.currentStep = "select_ticket_type";
  return showTicketTypeMenu(session);
}

async function handleTicketTypeSelection(session: any, userInput: string) {
  const types: any[] = session.data.tkt_types || [];
  if (types.length === 0) {
    return { message: "Session expired. Please dial again.", continueSession: false };
  }

  const selectedIndex = parseInt(userInput) - 1;
  const pageStartIndex = session.data.pageStartIndex || 0;
  const actualIndex = pageStartIndex + selectedIndex;

  if (
    isNaN(selectedIndex) ||
    selectedIndex < 0 ||
    selectedIndex >= ITEMS_PER_PAGE ||
    actualIndex >= types.length
  ) {
    return handleError(session, "Invalid selection. Enter a valid number.");
  }

  const selected = types[actualIndex];
  if (!selected) return handleError(session, "Ticket type not found. Please try again.");

  const available = selected.capacity - selected.sold;

  session.data.tkt_typeId = selected.id;
  session.data.tkt_typeName = selected.name;
  session.data.tkt_typePrice = selected.price;
  session.data.tkt_typeColor = selected.color;
  session.data.tkt_maxQty = Math.min(MAX_TICKET_QTY, available);
  session.data.errorCount = 0;
  session.markModified("data");

  session.currentStep = "enter_ticket_qty";

  const priceStr = selected.price === 0 ? "Free" : `GHS ${selected.price.toFixed(2)}`;
  return {
    message: compressMessage(
      `${truncateName(selected.name, 22)}\n${priceStr}/ticket\n${available} available\n\nEnter qty (1-${session.data.tkt_maxQty}):\n\n${getNavigationText("enter_ticket_qty")}`,
    ),
    continueSession: true,
  };
}

async function handleTicketQtyInput(session: any, userInput: string) {
  const qty = parseInt(userInput);
  const maxAllowed = session.data.tkt_maxQty || MAX_TICKET_QTY;

  if (isNaN(qty) || qty < 1 || qty > maxAllowed) {
    return handleError(session, `Enter a number between 1 and ${maxAllowed}.`);
  }

  session.data.tkt_qty = qty;
  session.data.tkt_total = qty * (session.data.tkt_typePrice || 0);
  session.data.errorCount = 0;
  session.markModified("data");
  session.currentStep = "enter_ticket_name";

  const totalStr =
    session.data.tkt_typePrice === 0 ? "Free" : `GHS ${session.data.tkt_total.toFixed(2)}`;

  return {
    message: compressMessage(
      `Qty: ${qty} ticket(s)\nTotal: ${totalStr}\n\nEnter your full name:\n\n${getNavigationText("enter_ticket_name")}`,
    ),
    continueSession: true,
  };
}

async function handleTicketNameInput(session: any, userInput: string) {
  const name = userInput.trim();

  if (!name || name.length < 2) {
    return handleError(session, "Please enter a valid name (min 2 characters).");
  }
  if (name.length > 60) {
    return handleError(session, "Name too long. Please enter a shorter name.");
  }

  session.data.tkt_buyerName = name;
  session.data.errorCount = 0;
  session.markModified("data");
  session.currentStep = "confirm_ticket";

  const eventName = truncateName(session.data.tkt_eventTitle, 20);
  const typeName = truncateName(session.data.tkt_typeName, 14);
  const totalStr =
    session.data.tkt_typePrice === 0 ? "Free" : `GHS ${session.data.tkt_total.toFixed(2)}`;

  return {
    message: compressMessage(
      `Order Summary\n\nEvent: ${eventName}\nTicket: ${typeName}\nQty: ${session.data.tkt_qty}\nName: ${truncateName(name, 16)}\nTotal: ${totalStr}\n\n1. Confirm\n2. Cancel`,
    ),
    continueSession: true,
  };
}

async function handleTicketConfirmation(
  session: any,
  userInput: string,
  phoneNumber: string,
) {
  if (userInput === "2") {
    session.isActive = false;
    return { message: "Order cancelled. Thank you for using PawaVotes.", continueSession: false };
  }
  if (userInput !== "1") {
    return handleError(session, "Enter 1 to confirm or 2 to cancel.");
  }

  // Free ticket — skip payment, complete immediately
  if (session.data.tkt_typePrice === 0) {
    return await processFreeTicket(session, phoneNumber);
  }

  // Paid — detect network and initiate mobile money charge
  const provider = detectMobileProvider(phoneNumber);
  if (!provider) {
    session.currentStep = "confirm_ticket_network";
    return {
      message: `Confirm your network:\n\n1. MTN\n2. Telecel\n3. AirtelTigo\n\n0. Cancel`,
      continueSession: true,
    };
  }

  return await processTicketPayment(session, phoneNumber, provider);
}

async function handleTicketNetworkConfirmation(
  session: any,
  userInput: string,
  phoneNumber: string,
) {
  const networkMap: { [key: string]: string } = { "1": "mtn", "2": "vod", "3": "tgo" };
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
    const ticketCodes = Array.from({ length: session.data.tkt_qty }, (_, i) =>
      `${session.data.tkt_eventCode}-${Date.now()}-${i + 1}-${randomBytes(3)
        .toString("hex")
        .toUpperCase()}`
    );

    await TicketOrder.create({
      reference,
      eventId: session.data.tkt_eventId,
      eventTitle: session.data.tkt_eventTitle,
      eventDate: session.data.tkt_eventDate,
      eventTime: session.data.tkt_eventTime,
      venueName: session.data.tkt_venueName,
      venueAddress: session.data.tkt_venueAddress,
      ticketTypeId: session.data.tkt_typeId,
      ticketTypeName: session.data.tkt_typeName,
      ticketTypeColor: session.data.tkt_typeColor || "#10b981",
      ticketBg: session.data.tkt_ticketBg || "",
      ticketTextColor: session.data.tkt_ticketTextColor || "light",
      quantity: session.data.tkt_qty,
      unitPrice: 0,
      totalAmount: 0,
      buyerName: session.data.tkt_buyerName,
      buyerEmail: `${phoneNumber.replace(/[^0-9]/g, "")}@ussd.pawavotes.com`,
      buyerPhone: phoneNumber,
      status: "completed",
      ticketCodes,
    });

    await EventModel.findOneAndUpdate(
      { _id: session.data.tkt_eventId, "ticketTypes.id": session.data.tkt_typeId },
      { $inc: { "ticketTypes.$.sold": session.data.tkt_qty, totalSold: session.data.tkt_qty } }
    );

    session.isActive = false;

    // SMS with download link (non-blocking)
    sendTicketSmsConfirmation(
      phoneNumber,
      session.data.tkt_buyerName,
      session.data.tkt_eventTitle,
      session.data.tkt_typeName,
      session.data.tkt_qty,
      reference,
    ).catch(() => {});

    // No email confirmation for USSD purchases — the buyer email is a generated placeholder

    return {
      message: compressMessage(
        `Ticket Confirmed!\nRef: ${reference.slice(-10)}\n\nEvent: ${truncateName(session.data.tkt_eventTitle, 18)}\nType: ${truncateName(session.data.tkt_typeName, 12)} (Free)\nQty: ${session.data.tkt_qty}\n\nDownload link sent via SMS!`,
      ),
      continueSession: false,
    };
  } catch (error: any) {
    console.error("[USSD Tickets] processFreeTicket error:", error);
    return { message: "Error processing your ticket. Please try again.", continueSession: false };
  }
}

async function processTicketPayment(session: any, phoneNumber: string, provider: string) {
  try {
    const reference = `TKTUSSD${Date.now()}${randomBytes(3).toString("hex")}`.substring(0, 32);
    const dummyEmail = `${phoneNumber.replace(/[^0-9]/g, "")}@ussd.pawavotes.com`;

    await TicketOrder.create({
      reference,
      eventId: session.data.tkt_eventId,
      eventTitle: session.data.tkt_eventTitle,
      eventDate: session.data.tkt_eventDate,
      eventTime: session.data.tkt_eventTime,
      venueName: session.data.tkt_venueName,
      venueAddress: session.data.tkt_venueAddress,
      ticketTypeId: session.data.tkt_typeId,
      ticketTypeName: session.data.tkt_typeName,
      ticketTypeColor: session.data.tkt_typeColor || "#10b981",
      ticketBg: session.data.tkt_ticketBg || "",
      ticketTextColor: session.data.tkt_ticketTextColor || "light",
      quantity: session.data.tkt_qty,
      unitPrice: session.data.tkt_typePrice,
      totalAmount: session.data.tkt_total,
      buyerName: session.data.tkt_buyerName,
      buyerEmail: dummyEmail,
      buyerPhone: phoneNumber,
      status: "pending",
    });

    session.data.tkt_paymentRef = reference;
    session.markModified("data");
    session.isActive = false;

    const shortRef = reference.substring(7, 20);

    // Fire Hubtel charge after 4s to let the USSD session close cleanly
    setTimeout(async () => {
      try {
        const hubtelRes = await initiateHubtelCharge(
          dummyEmail,
          session.data.tkt_total,
          phoneNumber,
          reference,
          provider,
        );

        if (!hubtelRes.success) {
          await TicketOrder.findOneAndUpdate({ reference }, { status: "failed" });
          return;
        }

        // Auto status check after 5 minutes as a safety net
        setTimeout(async () => {
          try {
            const order = await TicketOrder.findOne({ reference });
            if (!order || order.status !== "pending") return;
            await checkAndCompleteTicketOrder(reference);
          } catch (e) {
            console.error(`[${reference}] Ticket status check error:`, e);
          }
        }, 5 * 60 * 1000);
      } catch (err: any) {
        console.error(`[${reference}] Hubtel ticket charge error:`, err);
        await TicketOrder.findOneAndUpdate({ reference }, { status: "failed" });
      }
    }, 4000);

    return {
      message: compressMessage(
        `Payment request sent!\nRef: ${shortRef}\n\nTicket: ${truncateName(session.data.tkt_typeName, 14)} x${session.data.tkt_qty}\nAmount: GHS ${session.data.tkt_total.toFixed(2)}\n\nApprove on your phone. Download link sent via SMS on success.`,
      ),
      continueSession: false,
    };
  } catch (error: any) {
    console.error("[USSD Tickets] processTicketPayment error:", error);
    return { message: "Error processing payment. Please try again.", continueSession: false };
  }
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

    if (data.ResponseCode === "success" && data.Data?.transactionStatus === "success") {
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
        { $inc: { "ticketTypes.$.sold": order.quantity, totalSold: order.quantity } }
      );

      // SMS with download link (non-blocking)
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

      // Email confirmation (non-blocking) — skip generated USSD placeholder addresses
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