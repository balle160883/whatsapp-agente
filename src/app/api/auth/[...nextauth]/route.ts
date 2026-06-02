import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
