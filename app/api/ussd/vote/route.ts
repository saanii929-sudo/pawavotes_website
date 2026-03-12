import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import connectDB from "@/lib/mongodb";
import UssdSession from "@/models/UssdSession";
import Award from "@/models/Award";
import Category from "@/models/Category";
import Nominee from "@/models/Nominee";
import Vote from "@/models/Vote";
import PendingVote from "@/models/PendingVote";

const MAX_MESSAGE_LENGTH = 160;
const MAX_ERROR_COUNT = 3;
const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const ITEMS_PER_PAGE = 5;
const MIN_VOTES = 1;
const MAX_VOTES = 1000;
const HIGH_VOTE_THRESHOLD = 100;

// Helper function to mark session data as modified for Mongoose
function updateSessionData(session: any, updates: any) {
  Object.assign(session.data, updates);
  session.markModified('data');
}

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

function formatPhoneForPaystack(phoneNumber: string): string {
  let cleaned = phoneNumber.replace(/[\s\-+]/g, "");
  if (cleaned.startsWith("233")) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.startsWith("0")) {
    cleaned = cleaned.substring(1);
  }

  return "233" + cleaned;
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
    default:
      return {
        message: "Invalid session. Please try again.",
        continueSession: false,
      };
  }
}


function handleBackNavigation(session: any) {
  console.log(`USSD: Back navigation from step: ${session.currentStep}`);

  const stepFlow: { [key: string]: string } = {
    select_award: "welcome",
    quick_vote_code: "welcome",
    select_category: "select_award",
    nominee_method: "select_category",
    enter_nominee_code: "nominee_method",
    select_nominee: "nominee_method",
    enter_votes: "nominee_method",
    confirm_high_vote: "enter_votes",
    confirm: "enter_votes",
    confirm_network: "confirm",
    enter_payment_otp: "confirm",
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

async function showWelcome(session: any, userInput?: string) {
  // Handle Quick Vote option
  if (userInput === "2") {
    session.currentStep = "quick_vote_code";
    return {
      message: compressMessage(
        `Quick Vote\n\nEnter Nominee Code:\n(e.g., TGMA001)\n\n${getNavigationText("quick_vote_code")}`,
      ),
      continueSession: true,
    };
  }

  const awards = await Award.find({
    status: { $in: ["published", "active"] },
  })
    .select(
      "name status votingStartDate votingEndDate votingStartTime votingEndTime settings pricing",
    )
    .lean();

  if (awards.length === 0) {
    return {
      message:
        "No voting events are currently available. Please try again later.",
      continueSession: false,
    };
  }

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
    return {
      message:
        "Voting is currently closed for all events. Please check back later.",
      continueSession: false,
    };
  }

  // Store awards in session for later use
  session.data.awards = activeAwards;
  session.data.currentPage = 1;
  
  // If there's only one award, pre-select it
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
  
  session.markModified('data');

  // If no user input (first time), show welcome menu
  if (!userInput) {
    return {
      message: compressMessage(
        `Welcome to PawaVotes\n\n1. Browse Events\n2. Quick Vote (Code)\n\n${getNavigationText("welcome")}`,
      ),
      continueSession: true,
    };
  }

  // If user selected "1" (Browse Events), show award selection
  if (userInput === "1") {
    session.currentStep = "select_award";
    return showAwardMenu(session);
  }

  // If we get here with unexpected input, show welcome again
  return {
    message: compressMessage(
      `Welcome to PawaVotes\n\n1. Browse Events\n2. Quick Vote (Code)\n\n${getNavigationText("welcome")}`,
    ),
    continueSession: true,
  };
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

  if (numberOfVotes > HIGH_VOTE_THRESHOLD && !session.data.confirmedHighVote) {
    session.data.confirmedHighVote = true;
    session.data.tempVotes = numberOfVotes;
    session.currentStep = "confirm_high_vote";
    return {
      message: compressMessage(
        `Confirm ${numberOfVotes} votes?\n(GHS ${amount.toFixed(2)})\n\n1. Yes\n2. No`,
      ),
      continueSession: true,
    };
  }

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
  // Hubtel doesn't use OTP for USSD payments - this is kept for backward compatibility
  // but will redirect user to approve on phone instead
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

    console.log("processPayment - session.data:", JSON.stringify(session.data, null, 2));
    console.log("Creating pending vote with:", {
      awardId: session.data.awardId,
      categoryId: session.data.categoryId,
      nomineeId: session.data.nomineeId,
      numberOfVotes: session.data.numberOfVotes,
      amount: session.data.amount,
    });

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
      console.error("Pending vote creation error:", voteError);
      return {
        message: "Error creating vote record. Please try again.",
        continueSession: false,
      };
    }

    // Store payment reference for later use
    session.data.paymentReference = paymentReference;
    session.markModified('data');
    console.log(`Stored payment reference in session: ${paymentReference}`);

    // End USSD session immediately
    session.isActive = false;
    
    const offlineInstructions = getOfflineInstructions(
      provider,
      session.data.amount,
    );
    
    // Create a short reference for display
    const shortRef = paymentReference.substring(5, 20); // Remove "USSD-" prefix and truncate
    
    // Initiate Hubtel charge AFTER 4 seconds (as required by Hubtel)
    // This runs in the background after USSD session ends
    setTimeout(async () => {
      try {
        console.log(`[${paymentReference}] Initiating Hubtel charge after 4-second delay`);
        
        const hubtelResponse = await initiateHubtelCharge(
          dummyEmail,
          session.data.amount,
          phoneNumber,
          paymentReference,
          provider,
        );

        if (!hubtelResponse.success) {
          // Handle Hubtel API errors
          await PendingVote.findByIdAndUpdate(pendingVote._id, { status: "failed" });
          
          const errorMessage = hubtelResponse.error || "Payment initiation failed";
          console.error(`[${paymentReference}] Hubtel charge failed:`, errorMessage);
        } else {
          console.log(`[${paymentReference}] Hubtel charge initiated successfully`);
        }
      } catch (error: any) {
        console.error(`[${paymentReference}] Error in delayed Hubtel charge:`, error);
        await PendingVote.findByIdAndUpdate(pendingVote._id, { status: "failed" });
      }
    }, 4000); // 4-second delay as required by Hubtel

    // Return immediately to end USSD session
    return {
      message: compressMessage(
        `PAYMENT REQUEST SENT!\n\nIMPORTANT:\n${offlineInstructions}\n\nYour vote will be counted after approval.\n\nFor: ${truncateName(session.data.nomineeName, 20)}\nVotes: ${session.data.numberOfVotes}\nAmount: GHS ${session.data.amount.toFixed(2)}\n\nRef: ${shortRef}\n\nThank you!`,
      ),
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
      console.error("Hubtel credentials not configured");
      return { success: false, error: "Payment configuration error" };
    }

    // Format phone number to international format (233XXXXXXXXX)
    let formattedPhone = phoneNumber.replace(/[\s\-+]/g, "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "233" + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith("233")) {
      formattedPhone = "233" + formattedPhone;
    }

    // Map provider codes to Hubtel channel names
    const channelMap: { [key: string]: string } = {
      "mtn": "mtn-gh",
      "vod": "vodafone-gh",
      "tgo": "tigo-gh",
    };

    const channel = channelMap[provider] || "mtn-gh";

    console.log(
      `Original: ${phoneNumber} → Formatted: ${formattedPhone}, Provider: ${provider} → Channel: ${channel}`,
    );

    // Hubtel Receive Money request
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

    console.log(
      "Hubtel charge request:",
      JSON.stringify(hubtelRequest, null, 2),
    );

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
    console.log("Hubtel charge response:", JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error("Hubtel API error:", data);
      return { 
        success: false, 
        error: data.Message || "Payment service error",
        data 
      };
    }

    // Hubtel returns ResponseCode "0001" for pending transactions
    // ResponseCode "0000" for immediate success (rare)
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

// Removed Paystack OTP and charge status functions - Hubtel uses callback-based verification

function getOfflineInstructions(provider: string, amount: number): string {
  const amountStr = `GHS ${amount.toFixed(2)}`;
  switch (provider) {
    case "mtn":
      return `>> Dial *170# NOW\n>> Go to My Approvals\n>> Approve ${amountStr}`;
    case "vod":
      return `>> Dial *110# NOW\n>> Go to Pending Payments\n>> Approve ${amountStr}`;
    case "tgo":
      return `>> Check your phone NOW\n>> Approve ${amountStr}`;
    default:
      return `>> Check your phone NOW\n>> Approve ${amountStr}`;
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


// Removed Paystack verification - Hubtel uses webhook callbacks for payment confirmation

// Helper function to complete a pending vote
async function completePendingVote(pendingVote: any, sessionData: any) {
  try {
    // Create the actual vote record
    const vote = await Vote.create({
      awardId: pendingVote.awardId,
      categoryId: pendingVote.categoryId,
      nomineeId: pendingVote.nomineeId,
      voterEmail: pendingVote.email,
      voterPhone: pendingVote.phone,
      numberOfVotes: pendingVote.numberOfVotes,
      amount: pendingVote.amount,
      paymentReference: pendingVote.reference,
      paymentMethod: "mobile_money",
      paymentStatus: "completed",
    });

    // Update nominee vote count
    await Nominee.findByIdAndUpdate(pendingVote.nomineeId, {
      $inc: { voteCount: pendingVote.numberOfVotes },
    });

    // Update category vote count
    await Category.findByIdAndUpdate(pendingVote.categoryId, {
      $inc: { voteCount: pendingVote.numberOfVotes },
    });

    // Update award vote count
    await Award.findByIdAndUpdate(pendingVote.awardId, {
      $inc: { totalVotes: pendingVote.numberOfVotes },
    });

    // Mark pending vote as completed
    pendingVote.status = "completed";
    await pendingVote.save();

    console.log("Vote completed successfully:", vote._id);
    return { success: true, vote };
  } catch (error: any) {
    console.error("Complete pending vote error:", error);
    return { success: false, error: error.message };
  }
}
