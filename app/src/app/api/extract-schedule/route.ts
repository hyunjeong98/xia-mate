import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const responseSchema: Schema = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      date: { type: SchemaType.STRING, description: "yyyy-mm-dd" },
      time: { type: SchemaType.STRING, description: "hh:mm" },
      cast: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    },
    required: ["date", "time", "cast"],
  },
};

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const files = formData.getAll("images") as File[];

  if (!files.length) {
    return NextResponse.json({ error: "이미지가 없습니다." }, { status: 400 });
  }

  const inlineImages = await Promise.all(
    files.map(async (file) => ({
      inlineData: {
        mimeType: file.type,
        data: Buffer.from(await file.arrayBuffer()).toString("base64"),
      },
    }))
  );

  const model = genAI.getGenerativeModel({
    model: "gemini-3-flash-preview",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  const year = new Date().getFullYear();

  const result = await model.generateContent([
    ...inlineImages,
    {
      text: `첨부한 이미지들은 공연 캐스팅 스케줄이야. '김준수'의 스케줄만 뽑아서 반환해. 별도 언급이 없다면 시작 연도는 ${year}년이야.`,
    },
  ]);

  const schedules = JSON.parse(result.response.text());
  return NextResponse.json({ schedules });
}
