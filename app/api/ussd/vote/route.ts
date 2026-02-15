import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import UssdSession from '@/models/UssdSession';
import Award from '@/models/Award';
import Category from '@/models/Category';
import Nominee from '@/models/Nominee';
import Vote from '@/models/Vote';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { sessionId, phoneNumber, text, networkCode } = body;
    let session = await UssdSession.findOne({ sessionId });
    
    if (!session) {
      session = await UssdSession.create({
        sessionId,
        phoneNumber,
        currentStep: 'welcome',
        data: {},
        isActive: true,
        lastActivity: new Date(),
      });
    } else {
      session.lastActivity = new Date();
    }
    const userInput = text.split('*').pop() || '';
    const response = await handleUssdFlow(session, userInput, phoneNumber);
    await session.save();

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('USSD error:', error);
    return NextResponse.json({
      response: 'END An error occurred. Please try again later.',
    });
  }
}

async function handleUssdFlow(session: any, userInput: string, phoneNumber: string) {
  const step = session.currentStep;

  switch (step) {
    case 'welcome':
      return await showWelcome(session);

    case 'select_award':
      return await handleAwardSelection(session, userInput);

    case 'select_category':
      return await handleCategorySelection(session, userInput);

    case 'nominee_method':
      return await handleNomineeMethod(session, userInput);

    case 'enter_nominee_code':
      return await handleNomineeCodeEntry(session, userInput);

    case 'select_nominee':
      return await handleNomineeSelection(session, userInput);

    case 'enter_votes':
      return await handleVoteQuantity(session, userInput);

    case 'confirm':
      return await handleConfirmation(session, userInput, phoneNumber);

    default:
      return { response: 'END Invalid session. Please try again.' };
  }
}

async function showWelcome(session: any) {
  const awards = await Award.find({ status: 'published' })
    .select('name votingStartDate votingEndDate')
    .limit(10)
    .lean();
  if (awards.length === 0) {
    return { response: 'END No active awards available at the moment.' };
  }
  const now = new Date();
  const activeAwards = awards.filter(award => {
    if (!award.votingStartDate || !award.votingEndDate) return false;
    const start = new Date(award.votingStartDate);
    const end = new Date(award.votingEndDate);
    return now >= start && now <= end;
  });

  if (activeAwards.length === 0) {
    return { response: 'END No awards are currently open for voting.' };
  }

  let menu = 'CON Welcome to PawaVotes!\nSelect an award to vote:\n\n';
  activeAwards.forEach((award, index) => {
    menu += `${index + 1}. ${award.name}\n`;
  });

  session.currentStep = 'select_award';
  session.data.awards = activeAwards;

  return { response: menu };
}

async function handleAwardSelection(session: any, userInput: string) {
  const selectedIndex = parseInt(userInput) - 1;
  const awards = session.data.awards;

  if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= awards.length) {
    return { response: 'END Invalid selection. Please try again.' };
  }

  const selectedAward = awards[selectedIndex];
  session.data.awardId = selectedAward._id.toString();
  session.data.awardName = selectedAward.name;
  const categories = await Category.find({
    awardId: selectedAward._id,
    status: 'published',
  })
    .select('name')
    .limit(10)
    .lean();

  if (categories.length === 0) {
    return { response: 'END No categories available for this award.' };
  }

  let menu = `CON ${selectedAward.name}\nSelect a category:\n\n`;
  categories.forEach((category, index) => {
    menu += `${index + 1}. ${category.name}\n`;
  });

  session.currentStep = 'select_category';
  session.data.categories = categories;

  return { response: menu };
}

async function handleCategorySelection(session: any, userInput: string) {
  const selectedIndex = parseInt(userInput) - 1;
  const categories = session.data.categories;

  if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= categories.length) {
    return { response: 'END Invalid selection. Please try again.' };
  }

  const selectedCategory = categories[selectedIndex];
  session.data.categoryId = selectedCategory._id.toString();
  session.data.categoryName = selectedCategory.name;

  // Ask user how they want to select nominee
  session.currentStep = 'nominee_method';

  return {
    response: `CON ${selectedCategory.name}\n\nHow would you like to vote?\n\n1. Enter Nominee Code\n2. Browse Nominees`,
  };
}

async function handleNomineeMethod(session: any, userInput: string) {
  if (userInput === '1') {
    // User wants to enter nominee code
    session.currentStep = 'enter_nominee_code';
    return {
      response: `CON Enter the Nominee Code\n(e.g., GMA001):`,
    };
  } else if (userInput === '2') {
    // User wants to browse nominees
    const nominees = await Nominee.find({
      categoryId: session.data.categoryId,
      status: 'published',
      nominationStatus: 'accepted',
    })
      .select('name nomineeCode')
      .limit(10)
      .lean();

    if (nominees.length === 0) {
      return { response: 'END No nominees available for this category.' };
    }

    let menu = `CON ${session.data.categoryName}\nSelect a nominee:\n\n`;
    nominees.forEach((nominee, index) => {
      const code = nominee.nomineeCode ? ` (${nominee.nomineeCode})` : '';
      menu += `${index + 1}. ${nominee.name}${code}\n`;
    });

    session.currentStep = 'select_nominee';
    session.data.nominees = nominees;

    return { response: menu };
  } else {
    return { response: 'END Invalid selection. Please try again.' };
  }
}

async function handleNomineeCodeEntry(session: any, userInput: string) {
  const nomineeCode = userInput.trim().toUpperCase();

  // Find nominee by code
  const nominee = await Nominee.findOne({
    nomineeCode: nomineeCode,
    categoryId: session.data.categoryId,
    status: 'published',
    nominationStatus: 'accepted',
  })
    .select('name _id')
    .lean();

  if (!nominee) {
    return {
      response: `END Nominee code "${nomineeCode}" not found in this category. Please check the code and try again.`,
    };
  }

  // Set nominee data
  session.data.nomineeId = nominee._id.toString();
  session.data.nomineeName = nominee.name;
  session.data.nomineeCode = nomineeCode;

  // Get voting price
  const award = await Award.findById(session.data.awardId).select('pricing').lean();
  const pricePerVote = award?.pricing?.votingCost || 0.5;

  session.currentStep = 'enter_votes';

  return {
    response: `CON Voting for:\n${nominee.name} (${nomineeCode})\n\nGHS ${pricePerVote} per vote\n\nEnter number of votes (1-100):`,
  };
}

async function handleNomineeSelection(session: any, userInput: string) {
  const selectedIndex = parseInt(userInput) - 1;
  const nominees = session.data.nominees;

  if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= nominees.length) {
    return { response: 'END Invalid selection. Please try again.' };
  }

  const selectedNominee = nominees[selectedIndex];
  session.data.nomineeId = selectedNominee._id.toString();
  session.data.nomineeName = selectedNominee.name;
  session.data.nomineeCode = selectedNominee.nomineeCode;

  const award = await Award.findById(session.data.awardId).select('pricing').lean();
  const pricePerVote = award?.pricing?.votingCost || 0.5;

  session.currentStep = 'enter_votes';

  const codeDisplay = selectedNominee.nomineeCode ? ` (${selectedNominee.nomineeCode})` : '';
  return {
    response: `CON Voting for:\n${selectedNominee.name}${codeDisplay}\n\nGHS ${pricePerVote} per vote\n\nEnter number of votes (1-100):`,
  };
}

async function handleVoteQuantity(session: any, userInput: string) {
  const numberOfVotes = parseInt(userInput);
  if (isNaN(numberOfVotes) || numberOfVotes < 1 || numberOfVotes > 100) {
    return { response: 'END Invalid number. Please enter between 1 and 100.' };
  }
  const award = await Award.findById(session.data.awardId).select('pricing').lean();
  const pricePerVote = award?.pricing?.votingCost || 0.5;
  const amount = numberOfVotes * pricePerVote;

  session.data.numberOfVotes = numberOfVotes;
  session.data.amount = amount;
  session.currentStep = 'confirm';

  const codeDisplay = session.data.nomineeCode ? ` (${session.data.nomineeCode})` : '';
  return {
    response: `CON Confirm your vote:\n\nNominee: ${session.data.nomineeName}${codeDisplay}\nVotes: ${numberOfVotes}\nAmount: GHS ${amount.toFixed(2)}\n\n1. Confirm & Pay\n2. Cancel`,
  };
}

async function handleConfirmation(session: any, userInput: string, phoneNumber: string) {
  if (userInput === '2') {
    session.isActive = false;
    return { response: 'END Vote cancelled.' };
  }
  if (userInput !== '1') {
    return { response: 'END Invalid selection.' };
  }
  try {
    const paymentReference = `USSD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const dummyEmail = `${phoneNumber}@ussd.pawavotes.com`;
    
    const vote = await Vote.create({
      awardId: session.data.awardId,
      categoryId: session.data.categoryId,
      nomineeId: session.data.nomineeId,
      voterEmail: dummyEmail,
      voterPhone: phoneNumber,
      numberOfVotes: session.data.numberOfVotes,
      amount: session.data.amount,
      paymentReference,
      paymentMethod: 'ussd',
      paymentStatus: 'pending',
    });
    const paystackResponse = await initiatePaystackCharge(
      dummyEmail,
      session.data.amount,
      phoneNumber,
      paymentReference
    );

    if (paystackResponse.success) {
      session.isActive = false;
      return {
        response: `END Vote submitted!\n\nApprove the payment prompt on your phone (${phoneNumber}) to complete.\n\nYou will receive SMS confirmation from Paystack.`,
      };
    } else {
      await Vote.findByIdAndUpdate(vote._id, { paymentStatus: 'failed' });
      return {
        response: 'END Payment initiation failed. Please try again later.',
      };
    }
  } catch (error: any) {
    return {
      response: 'END An error occurred. Please try again.',
    };
  }
}

async function initiatePaystackCharge(
  email: string,
  amount: number,
  phoneNumber: string,
  reference: string
) {
  try {
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    const amountInKobo = Math.round(amount * 100);
    const provider = detectMobileProvider(phoneNumber);

    if (!provider) {
      console.error('Could not detect mobile provider for:', phoneNumber);
      return {
        success: false,
        error: 'Unsupported mobile network',
      };
    }

    console.log(`Initiating ${provider.toUpperCase()} mobile money charge for ${phoneNumber}`);

    const response = await fetch('https://api.paystack.co/charge', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: amountInKobo,
        mobile_money: {
          phone: phoneNumber,
          provider: provider,
        },
        reference,
        currency: 'GHS',
      }),
    });

    const data = await response.json();
    return {
      success: data.status === true,
      data,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

function detectMobileProvider(phoneNumber: string): string | null {
  const cleanNumber = phoneNumber.replace(/[\s\-+]/g, '');
  let prefix = '';
  
  if (cleanNumber.startsWith('233')) {
    prefix = cleanNumber.substring(3, 5);
  } else if (cleanNumber.startsWith('0')) {
    prefix = cleanNumber.substring(1, 3);
  } else {
    prefix = cleanNumber.substring(0, 2);
  }
  const mtnPrefixes = ['24', '25', '53', '54', '55', '59'];

  const vodafonePrefixes = ['20', '50'];
  
  const airtelTigoPrefixes = ['26', '27', '56', '57'];

  if (mtnPrefixes.includes(prefix)) {
    return 'mtn';
  } else if (vodafonePrefixes.includes(prefix)) {
    return 'vod';
  } else if (airtelTigoPrefixes.includes(prefix)) {
    return 'tgo';
  }
  return 'mtn';
}
