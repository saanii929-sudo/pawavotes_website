import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Nominee from '@/models/Nominee';
import { withAuth } from '@/middleware/auth';
import JSZip from 'jszip';
import fetch from 'node-fetch';
import { Buffer } from 'buffer';

async function downloadNominees(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const awardId = searchParams.get('awardId');

    if (!awardId) {
      return NextResponse.json(
        { error: 'Award ID is required' },
        { status: 400 }
      );
    }

    // Fetch all nominees for this award
    const nominees = await Nominee.find({ awardId })
      .populate('categoryId', 'name')
      .sort({ name: 1 });

    if (nominees.length === 0) {
      return NextResponse.json(
        { error: 'No nominees found for this award' },
        { status: 404 }
      );
    }

    // Create a new JSZip instance
    const zip = new JSZip();

    // Create a CSV content with nominee information
    let csvContent = 'Name,Nominee Code,Category,Email,Phone,Image URL\n';

    // Group nominees by name to avoid duplicates
    const nomineeMap = new Map();
    
    for (const nominee of nominees) {
      const key = nominee.name.trim().toLowerCase();
      if (!nomineeMap.has(key)) {
        nomineeMap.set(key, {
          name: nominee.name,
          image: nominee.image,
          email: nominee.email || '',
          phone: nominee.phone || '',
          categories: []
        });
      }
      
      nomineeMap.get(key).categories.push({
        name: (nominee.categoryId as any).name,
        code: nominee.nomineeCode
      });
    }

    // Process each unique nominee
    let imageIndex = 1;
    const imageFolder = zip.folder('images');

    for (const [, nomineeData] of nomineeMap) {
      // Add each category entry to CSV
      for (const category of nomineeData.categories) {
        const imageFileName = nomineeData.image ? `nominee_${imageIndex}.jpg` : 'No Image';
        csvContent += `"${nomineeData.name}","${category.code}","${category.name}","${nomineeData.email}","${nomineeData.phone}","${imageFileName}"\n`;
      }

      // Download and add image to zip if it exists
      if (nomineeData.image && imageFolder) {
        try {
          const imageUrl = nomineeData.image.startsWith('http') 
            ? nomineeData.image 
            : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${nomineeData.image}`;
          
          const imageResponse = await fetch(imageUrl);
          if (imageResponse.ok) {
            const arrayBuffer = await imageResponse.arrayBuffer();
            const imageBuffer = Buffer.from(arrayBuffer);
            const extension = nomineeData.image.match(/\.(jpg|jpeg|png|gif|webp)$/i)?.[1] || 'jpg';
            imageFolder.file(`nominee_${imageIndex}.${extension}`, imageBuffer);
          }
        } catch (error) {
          console.error(`Failed to download image for ${nomineeData.name}:`, error);
        }
      }

      imageIndex++;
    }

    // Add CSV file to zip
    zip.file('nominees.csv', csvContent);

    // Add a README file with instructions
    const readmeContent = `Nominees Export
================

This ZIP file contains:
1. nominees.csv - A CSV file with all nominee information
2. images/ - A folder containing nominee images

CSV Columns:
- Name: Nominee's full name
- Nominee Code: Unique code for the nominee in each category
- Category: Award category name
- Email: Nominee's email address
- Phone: Nominee's phone number
- Image URL: Reference to the image file in the images folder

Note: Some nominees may appear multiple times if they are nominated in multiple categories.

Generated: ${new Date().toISOString()}
`;

    zip.file('README.txt', readmeContent);

    // Generate the ZIP file as arraybuffer
    const zipData = await zip.generateAsync({ 
      type: 'arraybuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    // Return the ZIP file
    return new NextResponse(zipData, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="nominees_export.zip"`,
      },
    });

  } catch (error: any) {
    console.error('Download nominees error:', error);
    return NextResponse.json(
      { error: 'Failed to generate download', details: error.message },
      { status: 500 }
    );
  }
}

export const GET = withAuth(downloadNominees, 'organization');
