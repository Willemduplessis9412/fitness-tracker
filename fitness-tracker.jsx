import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
} from "recharts";
import {
  Flame, Dumbbell, Target, TrendingUp, Plus, Trash2, LogOut, Lock,
  CheckCircle2, User, Calendar, Activity, Trophy, ChevronRight, X, AlertTriangle, XCircle, Share2, Download, Repeat, Menu,
} from "lucide-react";
import { supabase } from "./src/supabaseClient.js";

/* ---------------------------------------------------------------------- */
/* Design tokens                                                          */
/* ---------------------------------------------------------------------- */

const TOKENS = `
  :root{
    --bg:#F1F1EE; --paper:#FFFFFF; --ink:#141414; --ink-soft:#1E1E1C;
    --line:#DADAD5; --line-strong:#B7B7B0;
    --cal:#FF4500; --cal-soft:#FFE0D0;
    --protein:#00B88A; --protein-soft:#CFF5E8;
    --carb:#F5A300; --carb-soft:#FFEBC2;
    --fat:#9B30FF; --fat-soft:#EDDBFF;
    --work:#0074FF; --work-soft:#D6E8FF;
    --good:#00C853; --warn:#FF1744;
    --radius:6px;
  }
  .ft-root{
    font-family:'Inter',-apple-system,sans-serif; background:var(--bg); color:var(--ink);
    min-height:100%; width:100%; box-sizing:border-box;
  }
  .ft-root *{ box-sizing:border-box; }
  .ft-display{ font-family:'Space Grotesk','Inter',sans-serif; }
  .ft-mono{ font-family:'IBM Plex Mono',monospace; font-variant-numeric:tabular-nums; }
  .ft-card{ background:var(--paper); border:1px solid var(--line); border-radius:var(--radius); padding:20px; }
  .ft-btn{
    font-family:'Space Grotesk',sans-serif; border:1px solid var(--ink); background:var(--ink); color:var(--bg);
    padding:10px 18px; border-radius:4px; font-size:14px; font-weight:500; cursor:pointer;
    display:inline-flex; align-items:center; gap:8px; transition:opacity .15s;
  }
  .ft-btn:hover{ opacity:.85; }
  .ft-btn:disabled{ opacity:.4; cursor:not-allowed; }
  .ft-btn-outline{
    background:transparent; color:var(--ink); border:1px solid var(--line-strong);
  }
  .ft-btn-outline:hover{ background:var(--paper); opacity:1; border-color:var(--ink); }
  .ft-input, .ft-select{
    width:100%; padding:9px 10px; border:1px solid var(--line-strong); border-radius:4px;
    background:var(--paper); color:var(--ink); font-family:'Inter',sans-serif; font-size:14px;
  }
  .ft-input:focus, .ft-select:focus{ outline:2px solid var(--work); outline-offset:1px; }
  .ft-label{ font-size:12px; text-transform:uppercase; letter-spacing:.04em; color:var(--ink-soft); font-weight:500; margin-bottom:6px; display:block; }
  .ft-tab{
    font-family:'Space Grotesk',sans-serif; font-size:14px; padding:10px 14px; border-radius:4px; cursor:pointer;
    display:flex; align-items:center; gap:10px; color:var(--bg); opacity:.65; border:none; background:transparent; width:100%; text-align:left;
  }
  .ft-tab:hover{ opacity:.9; }
  .ft-tab.active{ background:rgba(255,255,255,.12); opacity:1; }
  ::placeholder{ color:var(--ink-soft); opacity:.6; }
  @media print{
    .no-print{ display:none !important; }
    .ft-root{ background:#fff; }
    .print-area{ box-shadow:none !important; }
    body{ -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }

  .ft-hamburger{ display:none; }
  .ft-sidebar-close{ display:none; }
  .ft-overlay{ display:none; }

  @media (max-width: 768px){
    .ft-hamburger{
      display:flex; align-items:center; justify-content:center;
      width:42px; height:42px; border-radius:6px; border:1px solid var(--line-strong);
      background:var(--paper); color:var(--ink); cursor:pointer;
      position:fixed; top:12px; left:12px; z-index:70;
      box-shadow:0 2px 8px rgba(0,0,0,.15);
    }
    .ft-sidebar{
      position:fixed !important; top:0; left:0; height:100vh; z-index:65;
      transform:translateX(-100%); transition:transform .25s ease;
      box-shadow:4px 0 24px rgba(0,0,0,.4);
    }
    .ft-sidebar.open{ transform:translateX(0); }
    .ft-sidebar-close{
      display:flex; align-items:center; justify-content:center;
      position:absolute; top:10px; right:10px; width:28px; height:28px;
      background:transparent; border:none; color:var(--bg); cursor:pointer;
    }
    .ft-overlay.open{
      display:block; position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:60;
    }
    .ft-main{
      width:100% !important; padding:16px !important; padding-top:64px !important;
    }
    .ft-responsive-grid{ grid-template-columns:1fr !important; }
  }
`;

function useGoogleFonts() {
  useEffect(() => {
    if (document.getElementById("ft-fonts")) return;
    const link = document.createElement("link");
    link.id = "ft-fonts";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap";
    document.head.appendChild(link);
  }, []);
}

/* ---------------------------------------------------------------------- */
/* Reference data                                                         */
/* ---------------------------------------------------------------------- */

// per 100g: calories, protein(g), carbs(g), fat(g)
// per 100g: calories, protein(g), carbs(g), fat(g). Grouped by category for the search/select UI.
const FOOD_DB = [
  // Proteins — meat, poultry, seafood, eggs
  { cat: "Proteins", name: "Chicken breast, cooked", cal: 165, p: 31, c: 0, f: 3.6, serving: 150 },
  { cat: "Proteins", name: "Chicken thigh, cooked", cal: 209, p: 26, c: 0, f: 10.9, serving: 100 },
  { cat: "Proteins", name: "Chicken drumstick, cooked", cal: 172, p: 28, c: 0, f: 5.7, serving: 60 },
  { cat: "Proteins", name: "Turkey breast, cooked", cal: 135, p: 30, c: 0, f: 1, serving: 100 },
  { cat: "Proteins", name: "Ground beef 90/10, cooked", cal: 176, p: 20, c: 0, f: 10, serving: 100 },
  { cat: "Proteins", name: "Ground beef 80/20, cooked", cal: 254, p: 17, c: 0, f: 20, serving: 100 },
  { cat: "Proteins", name: "Beef steak, sirloin, cooked", cal: 183, p: 26, c: 0, f: 8, serving: 200 },
  { cat: "Proteins", name: "Beef mince, lean, cooked", cal: 215, p: 26, c: 0, f: 12, serving: 100 },
  { cat: "Proteins", name: "Pork chop, cooked", cal: 231, p: 26, c: 0, f: 14, serving: 150 },
  { cat: "Proteins", name: "Bacon, cooked", cal: 541, p: 37, c: 1.4, f: 42, serving: 30 },
  { cat: "Proteins", name: "Ham, sliced", cal: 145, p: 21, c: 1.5, f: 5.5, serving: 30 },
  { cat: "Proteins", name: "Lamb chop, cooked", cal: 294, p: 25, c: 0, f: 21, serving: 100 },
  { cat: "Proteins", name: "Boerewors, cooked", cal: 290, p: 17, c: 1.5, f: 24, serving: 100 },
  { cat: "Proteins", name: "Biltong", cal: 265, p: 50, c: 2, f: 5, serving: 30 },
  { cat: "Proteins", name: "Droëwors", cal: 320, p: 45, c: 2, f: 15, serving: 30 },
  { cat: "Proteins", name: "Salmon, cooked", cal: 208, p: 20, c: 0, f: 13, serving: 150 },
  { cat: "Proteins", name: "Tuna, canned in water", cal: 116, p: 26, c: 0, f: 0.8, serving: 100 },
  { cat: "Proteins", name: "Tuna, canned in oil", cal: 198, p: 25, c: 0, f: 10, serving: 100 },
  { cat: "Proteins", name: "Cod, cooked", cal: 105, p: 23, c: 0, f: 0.9, serving: 150 },
  { cat: "Proteins", name: "Hake, cooked", cal: 90, p: 19, c: 0, f: 1, serving: 150 },
  { cat: "Proteins", name: "Tilapia, cooked", cal: 128, p: 26, c: 0, f: 2.7, serving: 150 },
  { cat: "Proteins", name: "Shrimp / prawns, cooked", cal: 99, p: 24, c: 0.2, f: 0.3, serving: 100 },
  { cat: "Proteins", name: "Sardines, canned", cal: 208, p: 25, c: 0, f: 11, serving: 100 },
  { cat: "Proteins", name: "Eggs, whole", cal: 155, p: 13, c: 1.1, f: 11, serving: 50 },
  { cat: "Proteins", name: "Egg whites", cal: 52, p: 11, c: 0.7, f: 0.2, serving: 33 },

  // Dairy
  { cat: "Dairy", name: "Milk, full cream", cal: 61, p: 3.2, c: 4.8, f: 3.3, serving: 250 },
  { cat: "Dairy", name: "Milk, 2%", cal: 50, p: 3.4, c: 5, f: 2, serving: 250 },
  { cat: "Dairy", name: "Milk, skim", cal: 34, p: 3.4, c: 5, f: 0.1, serving: 250 },
  { cat: "Dairy", name: "Greek yogurt, plain", cal: 59, p: 10, c: 3.6, f: 0.4, serving: 170 },
  { cat: "Dairy", name: "Yogurt, plain low-fat", cal: 63, p: 5.3, c: 7, f: 1.6, serving: 170 },
  { cat: "Dairy", name: "Cottage cheese", cal: 98, p: 11, c: 3.4, f: 4.3, serving: 113 },
  { cat: "Dairy", name: "Cheddar cheese", cal: 403, p: 25, c: 1.3, f: 33, serving: 30 },
  { cat: "Dairy", name: "Mozzarella", cal: 280, p: 28, c: 3.1, f: 17, serving: 30 },
  { cat: "Dairy", name: "Feta cheese", cal: 264, p: 14, c: 4, f: 21, serving: 30 },
  { cat: "Dairy", name: "Cream cheese", cal: 342, p: 6, c: 4, f: 34, serving: 30 },
  { cat: "Dairy", name: "Butter", cal: 717, p: 0.9, c: 0.1, f: 81, serving: 14 },
  { cat: "Dairy", name: "Cream, heavy", cal: 340, p: 2.1, c: 2.8, f: 36, serving: 30 },

  // Grains & starches
  { cat: "Grains & Starches", name: "White rice, cooked", cal: 130, p: 2.7, c: 28, f: 0.3, serving: 150 },
  { cat: "Grains & Starches", name: "Brown rice, cooked", cal: 123, p: 2.7, c: 26, f: 1, serving: 150 },
  { cat: "Grains & Starches", name: "Basmati rice, cooked", cal: 121, p: 3.5, c: 25, f: 0.4, serving: 150 },
  { cat: "Grains & Starches", name: "Pasta, cooked", cal: 131, p: 5, c: 25, f: 1.1, serving: 140 },
  { cat: "Grains & Starches", name: "Whole wheat pasta, cooked", cal: 124, p: 5.3, c: 27, f: 1.1, serving: 140 },
  { cat: "Grains & Starches", name: "Oats, dry", cal: 389, p: 16.9, c: 66, f: 6.9, serving: 40 },
  { cat: "Grains & Starches", name: "Quinoa, cooked", cal: 120, p: 4.4, c: 21, f: 1.9, serving: 150 },
  { cat: "Grains & Starches", name: "White bread", cal: 265, p: 9, c: 49, f: 3.2, serving: 30 },
  { cat: "Grains & Starches", name: "Whole wheat bread", cal: 247, p: 13, c: 41, f: 3.4, serving: 30 },
  { cat: "Grains & Starches", name: "Sourdough bread", cal: 289, p: 11.4, c: 56, f: 1.6, serving: 35 },
  { cat: "Grains & Starches", name: "Bagel", cal: 250, p: 10, c: 49, f: 1.5, serving: 90 },
  { cat: "Grains & Starches", name: "Tortilla, flour", cal: 306, p: 8, c: 50, f: 7, serving: 45 },
  { cat: "Grains & Starches", name: "Couscous, cooked", cal: 112, p: 3.8, c: 23, f: 0.2, serving: 150 },
  { cat: "Grains & Starches", name: "Pap / mielie meal, cooked", cal: 122, p: 2.3, c: 26, f: 0.6, serving: 200 },
  { cat: "Grains & Starches", name: "Samp, cooked", cal: 120, p: 3, c: 25, f: 0.5, serving: 150 },
  { cat: "Grains & Starches", name: "Potato, boiled", cal: 87, p: 1.9, c: 20, f: 0.1, serving: 150 },
  { cat: "Grains & Starches", name: "Potato, baked", cal: 93, p: 2.5, c: 21, f: 0.1, serving: 173 },
  { cat: "Grains & Starches", name: "Sweet potato", cal: 86, p: 1.6, c: 20, f: 0.1, serving: 130 },
  { cat: "Grains & Starches", name: "Cornflakes", cal: 357, p: 7, c: 84, f: 0.9, serving: 30 },
  { cat: "Grains & Starches", name: "Muesli", cal: 375, p: 10, c: 66, f: 6, serving: 50 },

  // Legumes
  { cat: "Legumes", name: "Black beans, cooked", cal: 132, p: 8.9, c: 24, f: 0.5, serving: 130 },
  { cat: "Legumes", name: "Kidney beans, cooked", cal: 127, p: 8.7, c: 23, f: 0.5, serving: 130 },
  { cat: "Legumes", name: "Sugar beans, cooked", cal: 130, p: 9, c: 23, f: 0.5, serving: 130 },
  { cat: "Legumes", name: "Chickpeas, cooked", cal: 164, p: 8.9, c: 27, f: 2.6, serving: 130 },
  { cat: "Legumes", name: "Lentils, cooked", cal: 116, p: 9, c: 20, f: 0.4, serving: 100 },
  { cat: "Legumes", name: "Baked beans, canned", cal: 94, p: 5, c: 17, f: 0.5, serving: 130 },
  { cat: "Legumes", name: "Tofu, firm", cal: 76, p: 8, c: 1.9, f: 4.8, serving: 100 },
  { cat: "Legumes", name: "Edamame", cal: 122, p: 11, c: 10, f: 5, serving: 100 },

  // Vegetables
  { cat: "Vegetables", name: "Broccoli", cal: 34, p: 2.8, c: 7, f: 0.4, serving: 90 },
  { cat: "Vegetables", name: "Spinach", cal: 23, p: 2.9, c: 3.6, f: 0.4, serving: 30 },
  { cat: "Vegetables", name: "Carrots", cal: 41, p: 0.9, c: 10, f: 0.2, serving: 60 },
  { cat: "Vegetables", name: "Tomato", cal: 18, p: 0.9, c: 3.9, f: 0.2, serving: 120 },
  { cat: "Vegetables", name: "Cucumber", cal: 15, p: 0.7, c: 3.6, f: 0.1, serving: 100 },
  { cat: "Vegetables", name: "Onion", cal: 40, p: 1.1, c: 9.3, f: 0.1, serving: 110 },
  { cat: "Vegetables", name: "Bell pepper", cal: 31, p: 1, c: 6, f: 0.3, serving: 120 },
  { cat: "Vegetables", name: "Lettuce", cal: 15, p: 1.4, c: 2.9, f: 0.2, serving: 50 },
  { cat: "Vegetables", name: "Cabbage", cal: 25, p: 1.3, c: 5.8, f: 0.1, serving: 90 },
  { cat: "Vegetables", name: "Cauliflower", cal: 25, p: 1.9, c: 5, f: 0.3, serving: 100 },
  { cat: "Vegetables", name: "Green beans", cal: 31, p: 1.8, c: 7, f: 0.2, serving: 100 },
  { cat: "Vegetables", name: "Butternut squash", cal: 45, p: 1, c: 12, f: 0.1, serving: 150 },
  { cat: "Vegetables", name: "Baby marrow / zucchini", cal: 17, p: 1.2, c: 3.1, f: 0.3, serving: 100 },
  { cat: "Vegetables", name: "Mushrooms", cal: 22, p: 3.1, c: 3.3, f: 0.3, serving: 70 },
  { cat: "Vegetables", name: "Sweetcorn", cal: 86, p: 3.3, c: 19, f: 1.2, serving: 90 },
  { cat: "Vegetables", name: "Peas", cal: 81, p: 5.4, c: 14, f: 0.4, serving: 80 },
  { cat: "Vegetables", name: "Beetroot", cal: 43, p: 1.6, c: 10, f: 0.2, serving: 80 },
  { cat: "Vegetables", name: "Avocado", cal: 160, p: 2, c: 9, f: 15, serving: 150 },

  // Fruits
  { cat: "Fruits", name: "Banana", cal: 89, p: 1.1, c: 23, f: 0.3, serving: 118 },
  { cat: "Fruits", name: "Apple", cal: 52, p: 0.3, c: 14, f: 0.2, serving: 180 },
  { cat: "Fruits", name: "Orange", cal: 47, p: 0.9, c: 12, f: 0.1, serving: 130 },
  { cat: "Fruits", name: "Naartjie / mandarin", cal: 53, p: 0.8, c: 13, f: 0.3, serving: 74 },
  { cat: "Fruits", name: "Grapes", cal: 69, p: 0.7, c: 18, f: 0.2, serving: 100 },
  { cat: "Fruits", name: "Strawberries", cal: 32, p: 0.7, c: 7.7, f: 0.3, serving: 150 },
  { cat: "Fruits", name: "Blueberries", cal: 57, p: 0.7, c: 14, f: 0.3, serving: 100 },
  { cat: "Fruits", name: "Mango", cal: 60, p: 0.8, c: 15, f: 0.4, serving: 200 },
  { cat: "Fruits", name: "Pineapple", cal: 50, p: 0.5, c: 13, f: 0.1, serving: 165 },
  { cat: "Fruits", name: "Watermelon", cal: 30, p: 0.6, c: 8, f: 0.2, serving: 280 },
  { cat: "Fruits", name: "Pear", cal: 57, p: 0.4, c: 15, f: 0.1, serving: 178 },
  { cat: "Fruits", name: "Peach", cal: 39, p: 0.9, c: 10, f: 0.3, serving: 150 },
  { cat: "Fruits", name: "Grapefruit", cal: 42, p: 0.8, c: 11, f: 0.1, serving: 120 },
  { cat: "Fruits", name: "Kiwi", cal: 61, p: 1.1, c: 15, f: 0.5, serving: 76 },
  { cat: "Fruits", name: "Dates, dried", cal: 282, p: 2.5, c: 75, f: 0.4, serving: 24 },
  { cat: "Fruits", name: "Raisins", cal: 299, p: 3.1, c: 79, f: 0.5, serving: 40 },

  // Nuts, seeds & fats
  { cat: "Nuts, Seeds & Fats", name: "Almonds", cal: 579, p: 21, c: 22, f: 50, serving: 28 },
  { cat: "Nuts, Seeds & Fats", name: "Peanuts", cal: 567, p: 26, c: 16, f: 49, serving: 28 },
  { cat: "Nuts, Seeds & Fats", name: "Peanut butter", cal: 588, p: 25, c: 20, f: 50, serving: 32 },
  { cat: "Nuts, Seeds & Fats", name: "Cashews", cal: 553, p: 18, c: 30, f: 44, serving: 28 },
  { cat: "Nuts, Seeds & Fats", name: "Walnuts", cal: 654, p: 15, c: 14, f: 65, serving: 28 },
  { cat: "Nuts, Seeds & Fats", name: "Chia seeds", cal: 486, p: 17, c: 42, f: 31, serving: 15 },
  { cat: "Nuts, Seeds & Fats", name: "Sunflower seeds", cal: 584, p: 21, c: 20, f: 51, serving: 28 },
  { cat: "Nuts, Seeds & Fats", name: "Olive oil", cal: 884, p: 0, c: 0, f: 100, serving: 14 },
  { cat: "Nuts, Seeds & Fats", name: "Coconut oil", cal: 862, p: 0, c: 0, f: 100, serving: 14 },
  { cat: "Nuts, Seeds & Fats", name: "Sunflower oil", cal: 884, p: 0, c: 0, f: 100, serving: 14 },
  { cat: "Nuts, Seeds & Fats", name: "Mayonnaise", cal: 680, p: 1, c: 1, f: 75, serving: 15 },
  { cat: "Nuts, Seeds & Fats", name: "Margarine", cal: 717, p: 0.2, c: 0.9, f: 80, serving: 14 },

  // Baked goods & snacks
  { cat: "Baked Goods & Snacks", name: "Rusk", cal: 420, p: 10, c: 65, f: 14, serving: 35 },
  { cat: "Baked Goods & Snacks", name: "Vetkoek", cal: 270, p: 5, c: 34, f: 13, serving: 80 },
  { cat: "Baked Goods & Snacks", name: "Potato chips / crisps", cal: 536, p: 7, c: 53, f: 35, serving: 30 },
  { cat: "Baked Goods & Snacks", name: "Popcorn, plain", cal: 387, p: 13, c: 78, f: 4.5, serving: 28 },
  { cat: "Baked Goods & Snacks", name: "Pretzels", cal: 380, p: 10, c: 79, f: 2.6, serving: 30 },
  { cat: "Baked Goods & Snacks", name: "Chocolate, milk", cal: 535, p: 7.7, c: 59, f: 30, serving: 40 },
  { cat: "Baked Goods & Snacks", name: "Chocolate, dark 70%", cal: 598, p: 7.8, c: 46, f: 43, serving: 40 },
  { cat: "Baked Goods & Snacks", name: "Biscuit / cookie", cal: 480, p: 6, c: 65, f: 22, serving: 15 },
  { cat: "Baked Goods & Snacks", name: "Muffin", cal: 377, p: 6, c: 55, f: 15, serving: 110 },
  { cat: "Baked Goods & Snacks", name: "Croissant", cal: 406, p: 8.2, c: 45, f: 21, serving: 60 },
  { cat: "Baked Goods & Snacks", name: "Donut", cal: 452, p: 4.9, c: 51, f: 25, serving: 60 },
  { cat: "Baked Goods & Snacks", name: "Rice cakes", cal: 387, p: 8, c: 81, f: 3, serving: 9 },
  { cat: "Baked Goods & Snacks", name: "Granola bar", cal: 471, p: 10, c: 64, f: 20, serving: 40 },
  { cat: "Baked Goods & Snacks", name: "Protein bar", cal: 380, p: 30, c: 40, f: 12, serving: 60 },

  // Fast food & takeout
  { cat: "Fast Food & Takeout", name: "Pizza, cheese slice", cal: 266, p: 11, c: 33, f: 10, serving: 110 },
  { cat: "Fast Food & Takeout", name: "Hamburger, fast food", cal: 295, p: 17, c: 28, f: 14, serving: 110 },
  { cat: "Fast Food & Takeout", name: "French fries", cal: 312, p: 3.4, c: 41, f: 15, serving: 115 },
  { cat: "Fast Food & Takeout", name: "Fried chicken", cal: 246, p: 19, c: 8, f: 16, serving: 120 },
  { cat: "Fast Food & Takeout", name: "Boerewors roll", cal: 280, p: 12, c: 22, f: 16, serving: 150 },
  { cat: "Fast Food & Takeout", name: "Bunny chow (curry & bread)", cal: 200, p: 6, c: 28, f: 7, serving: 400 },
  { cat: "Fast Food & Takeout", name: "Chicken curry & rice", cal: 165, p: 9, c: 18, f: 6, serving: 350 },
  { cat: "Fast Food & Takeout", name: "Fish and chips", cal: 265, p: 12, c: 24, f: 14, serving: 400 },
  { cat: "Fast Food & Takeout", name: "Sushi, salmon roll", cal: 150, p: 6, c: 22, f: 4, serving: 150 },
  { cat: "Fast Food & Takeout", name: "Kebab / wrap", cal: 220, p: 14, c: 20, f: 10, serving: 250 },

  // Beverages
  { cat: "Beverages", name: "Cola / soft drink", cal: 42, p: 0, c: 10.6, f: 0, serving: 330 },
  { cat: "Beverages", name: "Orange juice", cal: 45, p: 0.7, c: 10.4, f: 0.2, serving: 250 },
  { cat: "Beverages", name: "Beer", cal: 43, p: 0.5, c: 3.6, f: 0, serving: 340 },
  { cat: "Beverages", name: "Wine, red", cal: 85, p: 0.1, c: 2.6, f: 0, serving: 150 },
  { cat: "Beverages", name: "Rooibos tea, plain", cal: 1, p: 0, c: 0.3, f: 0, serving: 250 },
  { cat: "Beverages", name: "Coffee, black", cal: 1, p: 0.1, c: 0, f: 0, serving: 250 },
  { cat: "Beverages", name: "Whey protein powder", cal: 400, p: 80, c: 8, f: 6, serving: 30 },
  { cat: "Beverages", name: "Energy drink", cal: 45, p: 0, c: 11, f: 0, serving: 250 },
  { cat: "Beverages", name: "Sports drink", cal: 26, p: 0, c: 6, f: 0, serving: 500 },

  // Condiments & sauces
  { cat: "Condiments & Sauces", name: "Ketchup", cal: 101, p: 1.2, c: 26, f: 0.1, serving: 17 },
  { cat: "Condiments & Sauces", name: "Mustard", cal: 66, p: 4, c: 8, f: 3, serving: 5 },
  { cat: "Condiments & Sauces", name: "Soy sauce", cal: 53, p: 8, c: 4.9, f: 0.1, serving: 18 },
  { cat: "Condiments & Sauces", name: "BBQ / braai sauce", cal: 172, p: 1, c: 40, f: 0.5, serving: 30 },
  { cat: "Condiments & Sauces", name: "Salad dressing, ranch", cal: 449, p: 1, c: 8, f: 47, serving: 30 },
  { cat: "Condiments & Sauces", name: "Hummus", cal: 166, p: 8, c: 14, f: 9.6, serving: 30 },
  { cat: "Condiments & Sauces", name: "Honey", cal: 304, p: 0.3, c: 82, f: 0, serving: 21 },
  { cat: "Condiments & Sauces", name: "Jam", cal: 250, p: 0.4, c: 65, f: 0.1, serving: 20 },
  { cat: "Condiments & Sauces", name: "Peri-peri sauce", cal: 90, p: 1, c: 12, f: 4, serving: 20 },
];
const FOOD_CATEGORIES = [...new Set(FOOD_DB.map((f) => f.cat))];

// MET values for calorie-burn estimate
const WORKOUT_TYPES = [
  { name: "Running", met: null, distanceBased: true },
  { name: "Walking, brisk", met: 4.3 },
  { name: "Cycling, moderate", met: 7.5 },
  { name: "Cycling, vigorous", met: 10 },
  { name: "Swimming", met: 8 },
  { name: "Weight training", met: 5 },
  { name: "HIIT", met: 8.5 },
  { name: "Yoga", met: 3 },
  { name: "Pilates", met: 3.5 },
  { name: "Rowing", met: 7 },
  { name: "Hiking", met: 6 },
  { name: "Basketball", met: 6.5 },
  { name: "Boxing", met: 9 },
  { name: "Dancing", met: 5.5 },
  { name: "Custom (enter calories)", met: null },
];

const ACTIVITY_MULT = {
  sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
};

/* ---------------------------------------------------------------------- */
/* Storage helpers (persist per-user via Supabase's kv_store table)       */
/* ---------------------------------------------------------------------- */

function notifyStoreError(action) {
  try {
    window.dispatchEvent(new CustomEvent("ft-store-error", { detail: { action } }));
  } catch {}
}

async function storeGet(key, fallback = null) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return fallback;
    const { data, error } = await supabase
      .from("kv_store")
      .select("value")
      .eq("user_id", session.user.id)
      .eq("key", key)
      .maybeSingle();
    if (error) {
      console.error("storage get failed", error);
      notifyStoreError("load");
      return fallback;
    }
    return data ? data.value : fallback;
  } catch (e) {
    console.error("storage get failed", e);
    notifyStoreError("load");
    return fallback;
  }
}
async function storeSet(key, value) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { error } = await supabase.from("kv_store").upsert({
      user_id: session.user.id,
      key,
      value,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.error("storage set failed", error);
      notifyStoreError("save");
    }
  } catch (e) {
    console.error("storage set failed", e);
    notifyStoreError("save");
  }
}

function todayStr(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtShort(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/* ---------------------------------------------------------------------- */
/* Calculations                                                           */
/* ---------------------------------------------------------------------- */

const GOAL_MULTIPLIERS = { maintain: 1, lose: 0.9, loseExtra: 0.8, gain: 1.1, gainExtra: 1.2 };

function calcSuggestedGoals({ age, weightKg, heightCm, gender, activity, goalType }) {
  const bmr =
    gender === "female"
      ? 10 * weightKg + 6.25 * heightCm - 5 * age - 161
      : 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  const maintenance = Math.round(bmr * (ACTIVITY_MULT[activity] || 1.375));

  // maintain / ±10% / ±20% — everything (calories, protein, carbs, fat) scales together
  const multiplier = GOAL_MULTIPLIERS[goalType] ?? 1;
  const calories = Math.max(1200, Math.round(maintenance * multiplier));

  const baseProtein = weightKg * 2; // g, at maintenance
  const protein = Math.round(baseProtein * multiplier);
  const fat = Math.round(((calories * 0.25) / 9));
  const proteinCals = protein * 4;
  const fatCals = fat * 9;
  const carb = Math.max(0, Math.round((calories - proteinCals - fatCals) / 4));

  return { calories, protein, carb, fat, maintenance };
}

/* ---------------------------------------------------------------------- */
/* Small shared UI                                                        */
/* ---------------------------------------------------------------------- */

function StatCard({ icon: Icon, label, value, unit, accent }) {
  return (
    <div className="ft-card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--ink-soft)" }}>
        <Icon size={15} color={accent} />
        <span className="ft-label" style={{ margin: 0 }}>{label}</span>
      </div>
      <div className="ft-mono ft-display" style={{ fontSize: 26, fontWeight: 600 }}>
        {value}
        {unit && <span style={{ fontSize: 13, color: "var(--ink-soft)", marginLeft: 4 }}>{unit}</span>}
      </div>
    </div>
  );
}

function ProgressBar({ pct, color, label, sub }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
        <span className="ft-mono" style={{ fontSize: 12, color: "var(--ink-soft)" }}>{sub}</span>
      </div>
      <div style={{ height: 8, background: "var(--line)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${clamped}%`, background: color, transition: "width .3s" }} />
      </div>
    </div>
  );
}

/* Streak strip: signature element — last 14 days, filled if food logged */
function StreakStrip({ days }) {
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "flex-end" }}>
      {days.map((d) => (
        <div key={d.date} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div
            title={`${d.date}: ${d.logged ? "logged" : "no entry"}`}
            style={{
              width: 10, height: d.logged ? 22 : 10, borderRadius: 2,
              background: d.logged ? "var(--cal)" : "var(--line-strong)",
            }}
          />
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Login / Paywall                                                        */
/* ---------------------------------------------------------------------- */

function AuthScreen() {
  const [mode, setMode] = useState("signin"); // "signin" | "signup" | "reset"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const switchMode = (next) => {
    setMode(next);
    setError("");
  };

  const handleSubmit = async () => {
    setError("");
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { name: name.trim() } },
        });
        if (err) throw err;
        if (!data.session) setCheckEmail(true);
      } else if (mode === "reset") {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin,
        });
        if (err) throw err;
        setResetSent(true);
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (err) throw err;
      }
    } catch (e) {
      setError(e.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  if (checkEmail) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "#000" }}>
        <div className="ft-card" style={{ maxWidth: 380, width: "100%", textAlign: "center" }}>
          <CheckCircle2 size={22} style={{ marginBottom: 8 }} />
          <h3 className="ft-display" style={{ marginTop: 0 }}>Check your email</h3>
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>
            We sent a confirmation link to <strong>{email}</strong>. Click it, then come back and sign in.
          </p>
          <button
            className="ft-btn-outline ft-btn"
            style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
            onClick={() => { setCheckEmail(false); switchMode("signin"); }}
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  if (resetSent) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "#000" }}>
        <div className="ft-card" style={{ maxWidth: 380, width: "100%", textAlign: "center" }}>
          <CheckCircle2 size={22} style={{ marginBottom: 8 }} />
          <h3 className="ft-display" style={{ marginTop: 0 }}>Check your email</h3>
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>
            We sent a password reset link to <strong>{email}</strong>. Click it to choose a new password.
          </p>
          <button
            className="ft-btn-outline ft-btn"
            style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
            onClick={() => { setResetSent(false); switchMode("signin"); }}
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", background: "#000", overflowX: "hidden" }}>
      <div style={{ width: "100%", background: "#fff", borderBottom: "1px solid var(--line)" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "16px 24px", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <Activity color="var(--ink)" size={33} />
            <span style={{ fontSize: 24, fontWeight: 700, fontFamily: "Georgia, serif", letterSpacing: "0.03em", textTransform: "uppercase", color: "var(--ink)" }}>FIT DATA</span>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, flex: "1 1 300px", justifyContent: "center" }}>
            {mode === "signup" && (
              <input className="ft-input" placeholder="Name" style={{ width: 140 }} value={name} onChange={(e) => setName(e.target.value)} />
            )}
            <input className="ft-input" type="email" placeholder="jordan@example.com" style={{ width: 200 }} value={email} onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && mode === "reset") handleSubmit(); }} />
            {mode !== "reset" && (
              <input className="ft-input" type="password" placeholder="••••••••" style={{ width: 160 }} value={password} onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }} />
            )}
            {mode === "signin" && (
              <a href="#" onClick={(e) => { e.preventDefault(); switchMode("reset"); }} style={{ fontSize: 12, color: "var(--ink-soft)", whiteSpace: "nowrap" }}>
                Forgot password?
              </a>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
            <button
              className="ft-btn"
              style={{ fontSize: 13, padding: "9px 16px" }}
              disabled={busy || !email.trim() || (mode !== "reset" && !password) || (mode === "signup" && !name.trim())}
              onClick={handleSubmit}
            >
              {busy ? "Please wait…" : mode === "signup" ? "Create account" : mode === "reset" ? "Send reset link" : "Sign in"} <ChevronRight size={15} />
            </button>
            <span style={{ fontSize: 12, color: "var(--ink-soft)", whiteSpace: "nowrap" }}>
              {mode === "signup" ? (
                <>Have an account?{" "}
                  <a href="#" onClick={(e) => { e.preventDefault(); switchMode("signin"); }} style={{ color: "var(--ink)" }}>Sign in</a>
                </>
              ) : mode === "reset" ? (
                <>Remembered it?{" "}
                  <a href="#" onClick={(e) => { e.preventDefault(); switchMode("signin"); }} style={{ color: "var(--ink)" }}>Sign in</a>
                </>
              ) : (
                <>No account?{" "}
                  <a href="#" onClick={(e) => { e.preventDefault(); switchMode("signup"); }} style={{ color: "var(--ink)" }}>Create one</a>
                </>
              )}
            </span>
          </div>
        </div>
        {error && (
          <p style={{ fontSize: 12, color: "var(--warn)", textAlign: "center", padding: "0 24px 12px", margin: 0 }}>{error}</p>
        )}
      </div>
      <AppShowcase />

      <div style={{ width: "100%", display: "flex", justifyContent: "center", padding: "0 24px 48px" }}>
      <footer style={{ display: "flex", flexWrap: "wrap", gap: 18, justifyContent: "center", marginTop: 56, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,.1)" }}>
        {[
          { label: "Cancellation Policy", href: "/cancellation-policy" },
          { label: "Refund Policy", href: "/refund-policy" },
          { label: "Privacy Policy", href: "/privacy" },
          { label: "Terms of Service", href: "/terms" },
        ].map((l) => (
          <a key={l.href} href={l.href} style={{ fontSize: 11, color: "rgba(255,255,255,.4)", textDecoration: "none" }}>
            {l.label}
          </a>
        ))}
      </footer>
      </div>
    </div>
  );
}

function PhoneMockup({ src, rotate, x, y, z, size }) {
  return (
    <div
      style={{
        position: "absolute", top: "50%", left: "50%", width: size, zIndex: z,
        transform: `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${rotate}deg)`,
      }}
    >
      <div
        style={{
          aspectRatio: "9 / 19.5", borderRadius: 26, border: "7px solid #1c1c1c", background: "#000",
          overflow: "hidden", boxShadow: "0 25px 60px rgba(0,0,0,.6)", position: "relative",
        }}
      >
        <div style={{ position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)", width: "34%", height: 16, background: "#1c1c1c", borderRadius: 10, zIndex: 2 }} />
        <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", display: "block" }} />
      </div>
    </div>
  );
}

function InstallShortcutButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent));
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    } else {
      setShowHint(true);
    }
  };

  return (
    <div style={{ textAlign: "center", maxWidth: 330 }}>
      <button
        className="ft-btn"
        style={{ justifyContent: "center", width: "100%", background: "#fff", color: "#000", border: "none", fontSize: 21, padding: "15px 27px" }}
        onClick={handleClick}
      >
        <Download size={22} /> Download Shortcut
      </button>
      <p style={{ fontSize: 17, color: "rgba(255,255,255,.5)", marginTop: 15 }}>
        Adds a Fit Data icon to your home screen — opens like an app, no app store needed.
      </p>
      {showHint && (
        <p style={{ fontSize: 18, color: "#fff", marginTop: 15, background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.14)", borderRadius: 12, padding: 15 }}>
          {isIOS
            ? <>On iPhone: tap the <strong>Share</strong> icon in Safari, then <strong>"Add to Home Screen."</strong></>
            : <>Look for <strong>"Install app"</strong> or <strong>"Add to Home Screen"</strong> in your browser's menu.</>}
        </p>
      )}
    </div>
  );
}

function AppShowcase() {
  const features = [
    { icon: Flame, shot: "/screenshots/food-log.png", title: "Log Your Food", desc: "Track calories, protein, carbs and fat for every meal in seconds." },
    { icon: Dumbbell, shot: "/screenshots/workout-log.png", title: "Log Your Workouts", desc: "Record exercises, sets, reps, and effort — or just the essentials." },
    { icon: TrendingUp, shot: "/screenshots/dashboard.png", title: "Track Your Fitness Journey", desc: "Daily and monthly reports show your progress at a glance." },
    { icon: Target, shot: "/screenshots/goals.png", title: "Goal Setting", desc: "Set calorie, macro, and training targets tailored to you." },
    { icon: Activity, shot: "/screenshots/measurements.png", title: "Measurements Tracking", desc: "Log InBody scans and body measurements over time." },
    { icon: Activity, shot: "/screenshots/steps.png", title: "Log Your Steps", desc: "Track your daily step count against your target, and see the last 7 days at a glance." },
    { icon: Trophy, shot: "/screenshots/fitness-test.png", title: "Fitness Test", desc: "Track any exercise you want — strength, distance, or time — and watch your results improve over time." },
  ];

  return (
    <>
      <div style={{ width: "100%", padding: "0 24px", overflow: "hidden" }}>
        <div style={{ maxWidth: 1400, width: "100%", margin: "0 auto" }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 36 }}>
            <div>
              <div style={{ position: "relative", height: 630, width: 510, flexShrink: 0 }}>
                <PhoneMockup src="/screenshots/food-log.png" rotate={-12} x={-142} y={30} z={1} size={225} />
                <PhoneMockup src="/screenshots/workout-log.png" rotate={12} x={82} y={30} z={1} size={225} />
                <PhoneMockup src="/screenshots/dashboard.png" rotate={0} x={-30} y={0} z={3} size={255} />
              </div>
              <p style={{ textAlign: "center", fontSize: 18, color: "rgba(255,255,255,.5)", marginTop: 36, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Everything you need to track your training
              </p>
            </div>
            <InstallShortcutButton />
          </div>
        </div>
      </div>

      <div
        style={{
          width: "100%", background: "#fff", marginTop: 80,
          borderTop: "1px solid rgba(255,255,255,.15)", padding: "72px 24px",
        }}
      >
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          <h2 className="ft-display" style={{ fontSize: 34, fontWeight: 700, color: "var(--ink)", textAlign: "center", marginTop: 0, marginBottom: 56, textTransform: "uppercase" }}>
            Features
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 56 }}>
            {features.map((f) => (
              <div key={f.title} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 40 }}>
                <div style={{ flexShrink: 0 }}>
                  {f.shot ? (
                    <div
                      style={{
                        width: 150, aspectRatio: "9 / 19.5", borderRadius: 30, padding: 8,
                        background: "linear-gradient(160deg, #dcdcdc, #808080 40%, #a8a8a8 60%, #555)",
                        boxShadow: "0 18px 40px rgba(0,0,0,.25), 0 0 0 1px rgba(0,0,0,.08)", position: "relative",
                      }}
                    >
                      <div style={{ position: "absolute", top: 17, left: "50%", transform: "translateX(-50%)", width: 8, height: 8, borderRadius: "50%", background: "#6a6a6a", boxShadow: "inset 0 1px 2px rgba(0,0,0,.5)", zIndex: 2 }} />
                      <div style={{ width: "100%", height: "100%", borderRadius: 22, overflow: "hidden", background: "#000" }}>
                        <img src={f.shot} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", display: "block" }} />
                      </div>
                    </div>
                  ) : (
                    <div style={{ width: 90, height: 90, borderRadius: 22, background: "var(--bg)", border: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <f.icon size={36} color="var(--ink)" />
                    </div>
                  )}
                </div>
                <div style={{ flex: "1 1 280px", maxWidth: 380 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 14, background: "var(--bg)", border: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                    <f.icon size={24} color="var(--ink)" />
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 600, color: "var(--ink)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.02em" }}>{f.title}</div>
                  <div style={{ fontSize: 18, color: "var(--ink-soft)", lineHeight: 1.6 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function ResetPasswordScreen({ onDone }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) { setError(err.message); return; }
    setDone(true);
  };

  if (done) {
    return (
      <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div className="ft-card" style={{ maxWidth: 380, width: "100%", textAlign: "center" }}>
          <CheckCircle2 size={22} style={{ marginBottom: 8 }} />
          <h3 className="ft-display" style={{ marginTop: 0 }}>Password updated</h3>
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>You can now continue using FIT DATA.</p>
          <button className="ft-btn" style={{ width: "100%", justifyContent: "center", marginTop: 8 }} onClick={onDone}>
            Continue <ChevronRight size={15} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="ft-card" style={{ maxWidth: 380, width: "100%" }}>
        <h3 className="ft-display" style={{ marginTop: 0 }}>Set a new password</h3>
        <div style={{ marginBottom: 14 }}>
          <label className="ft-label">New password</label>
          <input className="ft-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label className="ft-label">Confirm password</label>
          <input className="ft-input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }} />
        </div>
        {error && <p style={{ fontSize: 12, color: "var(--warn)", marginTop: -10, marginBottom: 16 }}>{error}</p>}
        <button
          className="ft-btn"
          style={{ width: "100%", justifyContent: "center" }}
          disabled={busy || !password || !confirm}
          onClick={handleSubmit}
        >
          {busy ? "Please wait…" : "Update password"} <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

const POLICY_LAST_UPDATED = "6 August 2026";

function PolicyPage({ title, children }) {
  return (
    <div className="ft-root">
      <style>{TOKENS}</style>
      <div style={{ minHeight: "100vh", background: "#000", padding: "48px 24px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <a href="/" style={{ fontSize: 13, color: "rgba(255,255,255,.5)", textDecoration: "none" }}>← Back to Fit Data</a>
          <h1 className="ft-display" style={{ fontSize: 28, color: "#fff", marginTop: 20, marginBottom: 6 }}>{title}</h1>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginBottom: 32 }}>Last updated: {POLICY_LAST_UPDATED}</p>
          <div style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,.8)" }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function PolicySection({ n, title, children }) {
  return (
    <p style={{ marginBottom: 18 }}>
      <strong style={{ color: "#fff" }}>{n}. {title}.</strong> {children}
    </p>
  );
}

function TermsOfServicePage() {
  return (
    <PolicyPage title="Terms of Service">
      <PolicySection n={1} title="Acceptance of terms">
        By creating an account and using FIT DATA ("the App"), you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, do not use the App.
      </PolicySection>
      <PolicySection n={2} title="Purpose of data collection">
        The information you provide (profile details, goals, food/workout/step logs, body measurements) is collected and used for one purpose only: to store and track your own fitness data, for you, as the paying account holder. It is not used for any other purpose, and it is not shared with other users. We do not sell your personal data to any third party, and we do not share it with advertisers or data brokers.
      </PolicySection>
      <PolicySection n={3} title="Who can access your data">
        No one besides you has access to your individual fitness data, other than the limited service providers described below, strictly to the extent needed to operate the App (for example, our database host storing it securely, or our payment processor handling your subscription payment).
      </PolicySection>
      <PolicySection n={4} title="Service providers">
        We use third-party service providers to operate the App — for example database hosting and payment processing. These providers only process your data to the extent necessary to provide that specific service, under confidentiality obligations, and never to sell or repurpose it. We do not store your full card details ourselves; card payments are handled directly by our payment processor.
      </PolicySection>
      <PolicySection n={5} title="POPIA compliance">
        We process your personal information in accordance with South Africa's Protection of Personal Information Act, 2013 (POPIA). See our Privacy Policy for full details on how your data is handled and your rights.
      </PolicySection>
      <PolicySection n={6} title="Account & subscription">
        Certain features require a paid subscription. Subscriptions renew automatically until cancelled. See our Cancellation Policy and Refund Policy for details.
      </PolicySection>
      <PolicySection n={7} title="Changes to these terms">
        We may update or modify these Terms, our Privacy Policy, our Cancellation Policy, our Refund Policy, or our pricing at any time and at our sole discretion, to reflect changes in our service, legal requirements, or business practices. We will make reasonable efforts to notify you of material changes. Continued use of the App after changes take effect constitutes acceptance of the revised terms.
      </PolicySection>
      <PolicySection n={8} title="No medical advice">
        FIT DATA is a tracking tool, not a medical device. Content in the App is not medical advice; consult a qualified professional before starting any diet or exercise program.
      </PolicySection>
      <PolicySection n={9} title="Termination">
        You may stop using the App and delete your account at any time. We may suspend or terminate accounts that violate these terms.
      </PolicySection>
      <PolicySection n={10} title="Limitation of liability">
        The App is provided "as is" without warranties of any kind. To the maximum extent permitted by applicable law, we are not liable for indirect, incidental, or consequential damages arising from your use of the App.
      </PolicySection>
      <PolicySection n={11} title="Governing law & contact">
        These terms are governed by the laws of South Africa. Questions about these terms can be sent to the support address listed in the App.
      </PolicySection>
    </PolicyPage>
  );
}

function PrivacyPolicyPage() {
  return (
    <PolicyPage title="Privacy Policy">
      <PolicySection n={1} title="What we collect">
        Your account email, profile details (name, weight, height, age, activity level), goals, food/workout/step logs, body measurements, and InBody scan results — only what you choose to enter into the App.
      </PolicySection>
      <PolicySection n={2} title="How we use it">
        Solely to operate and provide the fitness-tracking service to you. We do not use your data for advertising, we do not sell it, and we do not share it with data brokers.
      </PolicySection>
      <PolicySection n={3} title="Who can access it">
        Only you. The only exceptions are the limited service providers strictly necessary to run the App: our database host (which stores your data securely) and our payment processor (which handles your subscription payment). Neither is permitted to use your data for any other purpose.
      </PolicySection>
      <PolicySection n={4} title="POPIA rights">
        We process your personal information in accordance with South Africa's Protection of Personal Information Act, 2013 (POPIA), on the lawful basis of your consent and the necessity of processing to perform our contract with you. You have the right to request access to, correction of, or deletion of your personal information, and to object to its processing, by contacting us using the details below.
      </PolicySection>
      <PolicySection n={5} title="Data security">
        We maintain reasonable technical and organisational safeguards to protect your information against loss, unauthorised access, and disclosure.
      </PolicySection>
      <PolicySection n={6} title="Data retention">
        We keep your data for as long as your account is active. If you delete your account, your data is removed; you can also request deletion at any time by contacting us.
      </PolicySection>
      <PolicySection n={7} title="Changes to this policy">
        We may update this Privacy Policy at any time to reflect changes in our practices or legal requirements. Material changes will be flagged in the App.
      </PolicySection>
      <PolicySection n={8} title="Contact">
        Questions about this policy, or requests relating to your personal information, can be sent to the support address listed in the App.
      </PolicySection>
    </PolicyPage>
  );
}

function CancellationPolicyPage() {
  return (
    <PolicyPage title="Cancellation Policy">
      <PolicySection n={1} title="How to cancel">
        You can cancel your subscription at any time from within the App — open the menu and select "Cancel subscription." No need to contact support unless you run into an issue.
      </PolicySection>
      <PolicySection n={2} title="What happens when you cancel">
        Cancelling immediately stops all future billing — no further payments will be taken. Cancelling also immediately ends access to paid features (food/workout logging, goal tracking, and progress charts); we do not currently offer continued access through the remainder of an already-paid period.
      </PolicySection>
      <PolicySection n={3} title="No cancellation fees">
        There is no charge or penalty for cancelling your subscription.
      </PolicySection>
      <PolicySection n={4} title="Re-subscribing">
        You can subscribe again at any time from the App if you change your mind.
      </PolicySection>
      <PolicySection n={5} title="Contact">
        If you're having trouble cancelling, contact us at the support address listed in the App and we'll help directly.
      </PolicySection>
    </PolicyPage>
  );
}

function RefundPolicyPage() {
  return (
    <PolicyPage title="Refund Policy">
      <PolicySection n={1} title="Subscription fees">
        Subscription fees are billed in advance for each billing period (monthly or annual) and are non-refundable, except as set out below or as required by applicable law.
      </PolicySection>
      <PolicySection n={2} title="Billing errors">
        If you believe you were charged in error — for example a duplicate charge or a technical fault — contact us and we will investigate and issue a refund where appropriate.
      </PolicySection>
      <PolicySection n={3} title="Unused time after cancelling">
        Because cancelling immediately ends access to paid features (see our Cancellation Policy), there is no unused-time balance to refund — you are not billed again after cancelling, and you are not charged for time you can no longer access.
      </PolicySection>
      <PolicySection n={4} title="Your statutory rights">
        Nothing in this policy limits any rights you have under South Africa's Consumer Protection Act or Electronic Communications and Transactions Act that cannot lawfully be excluded.
      </PolicySection>
      <PolicySection n={5} title="Contact">
        For refund requests or billing disputes, contact us at the support address listed in the App.
      </PolicySection>
    </PolicyPage>
  );
}

const TERMS_VERSION = "1.1";

function TermsScreen({ onAccept, onDecline }) {
  const [agreed, setAgreed] = useState(false);
  return (
    <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="ft-card" style={{ maxWidth: 560, width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <CheckCircle2 size={18} />
          <span className="ft-display" style={{ fontSize: 18, fontWeight: 600 }}>Terms & Conditions</span>
        </div>
        <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 0, marginBottom: 14 }}>
          Please read and accept before continuing to FIT DATA.
        </p>

        <div
          style={{
            maxHeight: 280, overflowY: "auto", border: "1px solid var(--line)", borderRadius: 6,
            padding: 14, fontSize: 12.5, lineHeight: 1.55, color: "var(--ink-soft)", marginBottom: 16,
          }}
        >
          <p><strong>1. Acceptance of terms.</strong> By creating an account and using FIT DATA ("the App"), you agree to be bound by these Terms &amp; Conditions and our Privacy Policy. If you do not agree, do not use the App.</p>

          <p><strong>2. Purpose of data collection.</strong> The information you provide (profile details, goals, food/workout/step logs, body measurements) is collected and used for one purpose only: to store and track your own fitness data, for you, as the paying account holder. It is not used for any other purpose, and it is not shared with other users. We do not sell your personal data to any third party, and we do not share it with advertisers or data brokers.</p>

          <p><strong>3. Who can access your data.</strong> No one besides you has access to your individual fitness data, other than the limited service providers described in section 4, strictly to the extent needed to operate the App (for example, our database host storing it securely, or our payment processor handling your subscription payment). No FIT DATA staff, other user, or unrelated third party can view your personal fitness records.</p>

          <p><strong>4. Service providers.</strong> We use third-party service providers to operate the App — for example database hosting and payment processing. These providers only process your data to the extent necessary to provide that specific service, under confidentiality obligations, and never to sell or repurpose it. We do not store your full card details ourselves; card payments are handled directly by our payment processor.</p>

          <p><strong>5. POPIA compliance.</strong> We process your personal information in accordance with South Africa's Protection of Personal Information Act, 2013 (POPIA). Processing is limited to the purpose described in section 2, on the lawful basis of your consent and the necessity of processing to perform our contract with you. You have the right to request access to, correction of, or deletion of your personal information, and to object to its processing, by contacting us using the details in section 11. We maintain reasonable technical and organisational safeguards to protect your information against loss, unauthorised access, and disclosure.</p>

          <p><strong>6. Account &amp; subscription.</strong> Certain features require a paid subscription. Subscriptions renew automatically until cancelled. You may cancel at any time from within the App; cancellation stops future renewals and no further payments will be taken.</p>

          <p><strong>7. Changes to these terms.</strong> We may update or modify these Terms &amp; Conditions, our Privacy Policy, or our pricing at any time and at our sole discretion, to reflect changes in our service, legal requirements, or business practices. We will make reasonable efforts to notify you of material changes. Continued use of the App after changes take effect constitutes acceptance of the revised terms.</p>

          <p><strong>8. No medical advice.</strong> FIT DATA is a tracking tool, not a medical device. Content in the App is not medical advice; consult a qualified professional before starting any diet or exercise program.</p>

          <p><strong>9. Termination.</strong> You may stop using the App and delete your account at any time. We may suspend or terminate accounts that violate these terms.</p>

          <p><strong>10. Limitation of liability.</strong> The App is provided "as is" without warranties of any kind. To the maximum extent permitted by applicable law, we are not liable for indirect, incidental, or consequential damages arising from your use of the App.</p>

          <p><strong>11. Governing law &amp; contact.</strong> These terms are governed by the laws of South Africa. Questions about these terms, your data, or requests under POPIA can be sent to the support address listed in the App.</p>
        </div>

        <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.5, marginBottom: 18, cursor: "pointer" }}>
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ marginTop: 2 }} />
          <span>I have read and agree to the Terms &amp; Conditions and Privacy Policy, including that these terms may change at any time.</span>
        </label>

        <div style={{ display: "flex", gap: 10 }}>
          <button className="ft-btn-outline ft-btn" style={{ flex: 1, justifyContent: "center" }} onClick={onDecline}>
            Decline
          </button>
          <button
            className="ft-btn"
            style={{ flex: 1, justifyContent: "center" }}
            disabled={!agreed}
            onClick={onAccept}
          >
            Agree &amp; continue <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

function PaywallScreen({ onSubscribe, onBack }) {
  const [plan, setPlan] = useState("monthly");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const plans = {
    monthly: { label: "Monthly", price: "R99", cadence: "/month" },
    annual: { label: "Annual", price: "R999", cadence: "/year", badge: "Save 16%" },
  };

  const handleSubscribeClick = async () => {
    setError("");
    setBusy(true);
    try {
      await onSubscribe(plan);
    } catch (e) {
      setError(e.message || "Couldn't start checkout. Please try again.");
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="ft-card" style={{ maxWidth: 420, width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <Lock size={18} />
          <span className="ft-display" style={{ fontSize: 18, fontWeight: 600 }}>Unlock FIT DATA</span>
        </div>
        <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 0, marginBottom: 18 }}>
          A subscription unlocks goal tracking, food and workout logging, and progress charts.
        </p>
        <div className="ft-responsive-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
          {Object.entries(plans).map(([key, p]) => (
            <button
              key={key}
              onClick={() => setPlan(key)}
              className="ft-btn-outline ft-btn"
              style={{
                flexDirection: "column", alignItems: "flex-start", gap: 2, width: "100%",
                borderColor: plan === key ? "var(--ink)" : "var(--line-strong)",
                borderWidth: plan === key ? 2 : 1,
                background: plan === key ? "var(--paper)" : "transparent",
              }}
            >
              <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>{p.label} {p.badge && `· ${p.badge}`}</span>
              <span className="ft-mono" style={{ fontSize: 18, fontWeight: 600 }}>{p.price}<span style={{ fontSize: 11, color: "var(--ink-soft)" }}>{p.cadence}</span></span>
            </button>
          ))}
        </div>
        <ul style={{ fontSize: 13, color: "var(--ink-soft)", paddingLeft: 18, margin: "0 0 18px" }}>
          <li>Daily, weekly and monthly progress graphs</li>
          <li>Automatic calorie and macro calculation</li>
          <li>Food and workout logging</li>
          <li>Fitness test with progress history</li>
        </ul>
        {error && (
          <p style={{ fontSize: 12, color: "var(--warn)", marginTop: 0, marginBottom: 14 }}>{error}</p>
        )}
        <div style={{ display: "flex", gap: 10 }}>
          <button className="ft-btn-outline ft-btn" onClick={onBack} disabled={busy}>Back</button>
          <button className="ft-btn" style={{ flex: 1, justifyContent: "center" }} onClick={handleSubscribeClick} disabled={busy}>
            {busy ? "Redirecting to checkout…" : "Subscribe"} <CheckCircle2 size={15} />
          </button>
        </div>
        <p style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 14, marginBottom: 0 }}>
          You'll be redirected to Paystack's secure checkout to enter your card details. We never see or store your card number.
        </p>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Goals screen                                                           */
/* ---------------------------------------------------------------------- */

const GOAL_CATEGORIES = [
  { value: "race", label: "Race / event" },
  { value: "weight", label: "Weight target" },
  { value: "strength", label: "Strength target" },
  { value: "habit", label: "Habit / consistency" },
  { value: "custom", label: "Custom" },
];

function daysUntil(dateStr) {
  const target = new Date(dateStr + "T00:00:00");
  const today = new Date(todayStr() + "T00:00:00");
  return Math.round((target - today) / 86400000);
}

function MilestoneGoals({ milestones, addMilestone, toggleMilestone, removeMilestone }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("race");
  const [targetDate, setTargetDate] = useState(todayStr(30));
  const [targetValue, setTargetValue] = useState("");
  const [notes, setNotes] = useState("");

  const handleAdd = () => {
    if (!title.trim() || !targetDate) return;
    addMilestone({
      id: `${Date.now()}`, title: title.trim(), category, targetDate,
      targetValue: targetValue.trim(), notes: notes.trim(), completed: false,
    });
    setTitle(""); setTargetValue(""); setNotes("");
  };

  const sorted = milestones.slice().sort((a, b) => a.targetDate.localeCompare(b.targetDate));

  return (
    <div className="ft-card" style={{ marginTop: 20 }}>
      <h3 className="ft-display" style={{ marginTop: 0, fontSize: 16 }}>Milestone goals</h3>
      <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 0 }}>
        Date-specific goals like "run a marathon in September" or "hit 100kg squat by year end".
      </p>

      <div className="ft-responsive-grid" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 10, marginBottom: 10 }}>
        <div>
          <label className="ft-label">Goal</label>
          <input className="ft-input" placeholder="Run a marathon" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="ft-label">Category</label>
          <select className="ft-select" value={category} onChange={(e) => setCategory(e.target.value)}>
            {GOAL_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="ft-label">Target date</label>
          <input className="ft-input" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
        </div>
        <div>
          <label className="ft-label">Target value (optional)</label>
          <input className="ft-input" placeholder="e.g. 42.2 km, 100 kg" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label className="ft-label">Notes (optional)</label>
          <input className="ft-input" placeholder="Training plan, race name, reminders…" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
      <button className="ft-btn" onClick={handleAdd}>
        <Plus size={15} /> Add goal
      </button>

      <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 8 }}>
        {sorted.length === 0 && <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>No milestone goals yet.</p>}
        {sorted.map((m) => {
          const dLeft = daysUntil(m.targetDate);
          const overdue = dLeft < 0 && !m.completed;
          return (
            <div
              key={m.id}
              style={{
                display: "flex", alignItems: "center", gap: 12, padding: "10px 0",
                borderBottom: "1px solid var(--line)", opacity: m.completed ? 0.55 : 1,
              }}
            >
              <button
                onClick={() => toggleMilestone(m.id)}
                aria-label={m.completed ? "Mark incomplete" : "Mark complete"}
                style={{
                  width: 22, height: 22, borderRadius: "50%", flexShrink: 0, cursor: "pointer",
                  border: `1px solid ${m.completed ? "var(--good)" : "var(--line-strong)"}`,
                  background: m.completed ? "var(--good)" : "transparent",
                  color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {m.completed && <CheckCircle2 size={14} />}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, textDecoration: m.completed ? "line-through" : "none" }}>
                  {m.title} {m.targetValue && <span style={{ color: "var(--ink-soft)", fontWeight: 400 }}>· {m.targetValue}</span>}
                </div>
                <div className="ft-mono" style={{ fontSize: 12, color: overdue ? "var(--warn)" : "var(--ink-soft)" }}>
                  {fmtShort(m.targetDate)} · {GOAL_CATEGORIES.find((c) => c.value === m.category)?.label}
                  {" · "}
                  {m.completed ? "done" : overdue ? `${Math.abs(dLeft)}d overdue` : dLeft === 0 ? "today" : `${dLeft}d away`}
                </div>
                {m.notes && <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 2 }}>{m.notes}</div>}
              </div>
              <button className="ft-btn-outline ft-btn" style={{ padding: 6 }} onClick={() => removeMilestone(m.id)} aria-label="Remove goal">
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProfileScreen({ profile, setProfile, goals, setGoals, inbodyScans, addInbodyScan, removeInbodyScan, measurements, addMeasurement, removeMeasurement }) {
  const [form, setForm] = useState({
    age: profile.age || 30,
    weightKg: profile.weightKg || 75,
    heightCm: profile.heightCm || 175,
    gender: profile.gender || "male",
    activity: profile.activity || "moderate",
    targetWeightKg: profile.targetWeightKg || profile.weightKg || 75,
  });
  const [saved, setSaved] = useState(false);
  const [goalAdjust, setGoalAdjust] = useState(goals.goalAdjust || "maintain");
  const suggested = useMemo(() => calcSuggestedGoals({ ...profile, goalType: goalAdjust }), [profile, goalAdjust]);

  useEffect(() => {
    setGoals({
      ...goals,
      calories: suggested.calories,
      protein: suggested.protein,
      carb: suggested.carb,
      fat: suggested.fat,
      targetWeightKg: profile.targetWeightKg,
      goalAdjust,
    });
  }, [suggested, profile.targetWeightKg, goalAdjust]);

  const field = (key, label, type = "number", opts) => (
    <div style={{ marginBottom: 12 }}>
      <label className="ft-label">{label}</label>
      {opts ? (
        <select className="ft-select" value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}>
          {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input className="ft-input" type={type} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
      )}
    </div>
  );

  const save = () => {
    setProfile({ ...profile, ...form });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <div className="ft-responsive-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div className="ft-card">
          <h3 className="ft-display" style={{ marginTop: 0, fontSize: 16 }}>Your profile</h3>
          <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 0 }}>
            Used to calculate your suggested calorie and macro targets.
          </p>
          <div className="ft-responsive-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {field("age", "Age")}
            {field("weightKg", "Weight (kg)")}
            {field("heightCm", "Height (cm)")}
            {field("gender", "Gender", "select", [{ value: "male", label: "Male" }, { value: "female", label: "Female" }])}
            {field("activity", "Activity level", "select", [
              { value: "sedentary", label: "Sedentary" },
              { value: "light", label: "Lightly active" },
              { value: "moderate", label: "Moderately active" },
              { value: "active", label: "Active" },
              { value: "very_active", label: "Very active" },
            ])}
            {field("targetWeightKg", "Target weight (kg)")}
          </div>
          <button className="ft-btn" style={{ marginTop: 8, width: "100%", justifyContent: "center" }} onClick={save}>
            {saved ? <><CheckCircle2 size={15} /> Saved</> : "Save profile"}
          </button>
        </div>

        <div className="ft-card">
          <label className="ft-label">Goal adjustment</label>
          <select
            className="ft-select"
            value={goalAdjust}
            onChange={(e) => setGoalAdjust(e.target.value)}
            style={{ marginBottom: 16 }}
          >
            <option value="maintain">Maintain</option>
            <option value="lose">Lose weight (−10%)</option>
            <option value="loseExtra">Lose weight extra (−20%)</option>
            <option value="gain">Gain weight (+10%)</option>
            <option value="gainExtra">Gain weight extra (+20%)</option>
          </select>

          <h3 className="ft-display" style={{ marginTop: 0, fontSize: 16 }}>Daily calorie & macro targets</h3>
          <div className="ft-card" style={{ background: "var(--bg)", marginBottom: 14, padding: 12 }}>
            <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: "0 0 6px" }}>
              Maintenance estimate (Mifflin-St Jeor): <span className="ft-mono">{suggested.maintenance} kcal</span>
            </p>
            <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: "0 0 6px" }}>
              {{
                maintain: "Target (maintain):",
                lose: "Target after −10% for weight loss:",
                loseExtra: "Target after −20% for weight loss:",
                gain: "Target after +10% for weight gain:",
                gainExtra: "Target after +20% for weight gain:",
              }[goalAdjust]}
              {" "}
              <span className="ft-mono">
                ({suggested.maintenance} × {{ maintain: "1.0", lose: "0.9", loseExtra: "0.8", gain: "1.1", gainExtra: "1.2" }[goalAdjust]} = {suggested.calories})
              </span>
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>Calories</span>
                <span className="ft-mono" style={{ fontSize: 15, fontWeight: 600 }}>{suggested.calories} kcal</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>Protein</span>
                <span className="ft-mono" style={{ fontSize: 15, fontWeight: 600 }}>{suggested.protein} g</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>Carbs</span>
                <span className="ft-mono" style={{ fontSize: 15, fontWeight: 600 }}>{suggested.carb} g</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>Fat</span>
                <span className="ft-mono" style={{ fontSize: 15, fontWeight: 600 }}>{suggested.fat} g</span>
              </div>
            </div>
            <p style={{ fontSize: 11, color: "var(--ink-soft)", margin: "8px 0 0" }}>
              Automatic from your details above and the goal adjustment. Click "Save profile" after changing age/weight/height/activity to update this.
            </p>
          </div>

          <p style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 10 }}>
            This is a general estimate, not medical advice. Consult a professional for personalized guidance.
          </p>
        </div>
      </div>

      <InBodyBlock scans={inbodyScans} addScan={addInbodyScan} removeScan={removeInbodyScan} />
      <MeasurementsBlock measurements={measurements} addMeasurement={addMeasurement} removeMeasurement={removeMeasurement} />
    </div>
  );
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function pad2(n) { return String(n).padStart(2, "0"); }
function ymd(y, m, d) { return `${y}-${pad2(m + 1)}-${pad2(d)}`; }

function TrainingCalendar({ selectedDates, onToggle, onMonthChange }) {
  const [viewMonth, setViewMonth] = useState(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });

  useEffect(() => {
    if (onMonthChange) onMonthChange(viewMonth);
  }, [viewMonth]);

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = todayStr();

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <button className="ft-btn-outline ft-btn" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => setViewMonth(new Date(year, month - 1, 1))}>‹</button>
        <span className="ft-display" style={{ fontSize: 13, fontWeight: 600 }}>
          {viewMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </span>
        <button className="ft-btn-outline ft-btn" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => setViewMonth(new Date(year, month + 1, 1))}>›</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
        {DAY_NAMES.map((d) => (
          <div key={d} style={{ textAlign: "center", fontSize: 10, textTransform: "uppercase", color: "var(--ink-soft)" }}>{d[0]}</div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {cells.map((d, i) => {
          if (d === null) return <div key={`b${i}`} />;
          const dateStr = ymd(year, month, d);
          const active = selectedDates.includes(dateStr);
          const isToday = dateStr === today;
          return (
            <button
              key={dateStr}
              onClick={() => onToggle(dateStr)}
              style={{
                aspectRatio: "1", borderRadius: 4, cursor: "pointer", fontSize: 12,
                border: isToday ? "1px solid var(--ink)" : "1px solid var(--line)",
                background: active ? "var(--work)" : "var(--paper)",
                color: active ? "#fff" : "var(--ink)",
                fontWeight: isToday ? 700 : 400,
              }}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function GoalsScreen({ goals, setGoals, profile, milestones, addMilestone, toggleMilestone, removeMilestone }) {
  const [form, setForm] = useState({
    steps: goals.steps || 8000,
    trainingDates: goals.trainingDates || [],
  });

  const now = new Date();
  const currentMonthPrefix = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
  const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const workoutsThisMonth = form.trainingDates.filter((d) => d.startsWith(currentMonthPrefix)).length;
  const weeklyEquivalent = Math.round((workoutsThisMonth / daysInCurrentMonth) * 7 * 10) / 10;

  // separate from the "real" current month above — this follows whichever month is browsed in the calendar
  const [viewedMonth, setViewedMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const viewedMonthPrefix = `${viewedMonth.getFullYear()}-${pad2(viewedMonth.getMonth() + 1)}`;
  const workoutsInViewedMonth = form.trainingDates.filter((d) => d.startsWith(viewedMonthPrefix)).length;
  const viewedMonthLabel = viewedMonth.toLocaleDateString(undefined, { month: "long" });

  useEffect(() => {
    setGoals({
      ...goals,
      workoutsPerMonth: workoutsThisMonth,
      workoutsPerWeek: weeklyEquivalent,
      steps: Number(form.steps) || 0,
      trainingDates: form.trainingDates,
    });
  }, [form.steps, form.trainingDates, workoutsThisMonth, weeklyEquivalent]);

  const toggleDate = (dateStr) => {
    setForm((f) => ({
      ...f,
      trainingDates: f.trainingDates.includes(dateStr) ? f.trainingDates.filter((d) => d !== dateStr) : [...f.trainingDates, dateStr],
    }));
  };

  return (
    <>
    <div className="ft-responsive-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      <div className="ft-card">
        <h3 className="ft-display" style={{ marginTop: 0, fontSize: 16 }}>Daily steps</h3>
        <label className="ft-label">Steps target</label>
        <input className="ft-input" type="number" value={form.steps} onChange={(e) => setForm({ ...form, steps: e.target.value })} />
      </div>

      <div className="ft-card">
        <h3 className="ft-display" style={{ marginTop: 0, fontSize: 16 }}>Workouts</h3>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
          <span className="ft-label" style={{ margin: 0 }}>Total workout days in {viewedMonthLabel}</span>
          <span className="ft-mono" style={{ fontSize: 20, fontWeight: 600 }}>{workoutsInViewedMonth}</span>
        </div>

        <label className="ft-label">Training plan — which days?</label>
        <p style={{ fontSize: 11, color: "var(--ink-soft)", margin: "0 0 8px" }}>
          Tap dates to mark them as planned training days. The dashboard will flag one if it isn't logged.
        </p>
        <TrainingCalendar selectedDates={form.trainingDates} onToggle={toggleDate} onMonthChange={setViewedMonth} />
      </div>
    </div>

    <MilestoneGoals milestones={milestones} addMilestone={addMilestone} toggleMilestone={toggleMilestone} removeMilestone={removeMilestone} />
    </>
  );
}

/* ---------------------------------------------------------------------- */
/* Food log screen                                                        */
/* ---------------------------------------------------------------------- */

function FoodLogScreen({ date, setDate, entries, addEntry, removeEntry, goals, customFoods, addCustomFood }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(FOOD_DB[0].name);
  const [grams, setGrams] = useState(100);
  const [showNewItem, setShowNewItem] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", kj: "", protein: "", carbs: "", fat: "", grams: 100 });

  const fullDB = useMemo(() => {
    const custom = (customFoods || []).map((f) => ({ ...f, cat: "My Foods" }));
    return [...custom, ...FOOD_DB];
  }, [customFoods]);
  const categories = (customFoods && customFoods.length > 0) ? ["My Foods", ...FOOD_CATEGORIES] : FOOD_CATEGORIES;

  const filtered = fullDB.filter((f) => f.name.toLowerCase().includes(query.toLowerCase()));
  const selectedFood = fullDB.find((f) => f.name === selected);

  useEffect(() => {
    if (!filtered.some((f) => f.name === selected) && filtered.length > 0) {
      setSelected(filtered[0].name);
    }
  }, [query, customFoods]);

  const totals = entries.reduce(
    (acc, e) => ({ cal: acc.cal + e.cal, p: acc.p + e.p, c: acc.c + e.c, f: acc.f + e.f }),
    { cal: 0, p: 0, c: 0, f: 0 }
  );

  const handleAdd = () => {
    const food = fullDB.find((f) => f.name === selected);
    if (!food || !grams) return;
    const ratio = Number(grams) / 100;
    addEntry({
      id: `${Date.now()}`,
      food: food.name,
      grams: Number(grams),
      cal: Math.round(food.cal * ratio),
      p: Math.round(food.p * ratio * 10) / 10,
      c: Math.round(food.c * ratio * 10) / 10,
      f: Math.round(food.f * ratio * 10) / 10,
    });
  };

  const handleCreateFood = () => {
    if (!newItem.name.trim() || !newItem.kj) return;
    // South African labels list Energy in kJ — 1 kcal = 4.184 kJ
    const cal = Math.round(Number(newItem.kj) / 4.184);
    const food = {
      name: newItem.name.trim(),
      cal,
      p: Number(newItem.protein) || 0,
      c: Number(newItem.carbs) || 0,
      f: Number(newItem.fat) || 0,
    };
    addCustomFood(food);
    setSelected(food.name);
    const gramsAmt = Number(newItem.grams) || 100;
    setGrams(gramsAmt);
    const ratio = gramsAmt / 100;
    addEntry({
      id: `${Date.now()}`,
      food: food.name,
      grams: gramsAmt,
      cal: Math.round(food.cal * ratio),
      p: Math.round(food.p * ratio * 10) / 10,
      c: Math.round(food.c * ratio * 10) / 10,
      f: Math.round(food.f * ratio * 10) / 10,
    });
    setNewItem({ name: "", kj: "", protein: "", carbs: "", fat: "", grams: 100 });
    setShowNewItem(false);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <Calendar size={16} />
        <input className="ft-input" style={{ width: 170 }} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      <div className="ft-responsive-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 20 }}>
        <div className="ft-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <h3 className="ft-display" style={{ margin: 0, fontSize: 16 }}>Add food</h3>
            <button className="ft-btn-outline ft-btn" style={{ fontSize: 12, padding: "6px 10px" }} onClick={() => setShowNewItem((s) => !s)}>
              <Plus size={13} /> New item
            </button>
          </div>

          {showNewItem && (
            <div className="ft-card" style={{ background: "var(--bg)", padding: 12, marginTop: 10, marginBottom: 14 }}>
              <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: "0 0 10px" }}>
                Type in the nutrition values from the back of the label — the "per 100g" row.
              </p>
              <div style={{ marginBottom: 8 }}>
                <label className="ft-label">Item name</label>
                <input className="ft-input" placeholder="e.g. Woolworths granola" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
                <div>
                  <label className="ft-label">Energy (kJ /100g)</label>
                  <input className="ft-input" type="number" placeholder="e.g. 1650" value={newItem.kj} onChange={(e) => setNewItem({ ...newItem, kj: e.target.value })} />
                </div>
                <div>
                  <label className="ft-label">Protein (g /100g)</label>
                  <input className="ft-input" type="number" value={newItem.protein} onChange={(e) => setNewItem({ ...newItem, protein: e.target.value })} />
                </div>
                <div>
                  <label className="ft-label">Carbs (g /100g)</label>
                  <input className="ft-input" type="number" value={newItem.carbs} onChange={(e) => setNewItem({ ...newItem, carbs: e.target.value })} />
                </div>
                <div>
                  <label className="ft-label">Fat (g /100g)</label>
                  <input className="ft-input" type="number" value={newItem.fat} onChange={(e) => setNewItem({ ...newItem, fat: e.target.value })} />
                </div>
              </div>
              {newItem.kj && (
                <p className="ft-mono" style={{ fontSize: 11, color: "var(--ink-soft)", margin: "0 0 10px" }}>
                  = {Math.round(Number(newItem.kj) / 4.184)} kcal /100g
                </p>
              )}
              <div style={{ marginBottom: 10 }}>
                <label className="ft-label">Amount you're eating (grams)</label>
                <input className="ft-input" type="number" value={newItem.grams} onChange={(e) => setNewItem({ ...newItem, grams: e.target.value })} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="ft-btn-outline ft-btn" style={{ flex: 1, justifyContent: "center" }} onClick={() => setShowNewItem(false)}>Cancel</button>
                <button className="ft-btn" style={{ flex: 1, justifyContent: "center" }} disabled={!newItem.name.trim() || !newItem.kj} onClick={handleCreateFood}>Save & add to log</button>
              </div>
            </div>
          )}

          <div style={{ marginBottom: 10, marginTop: 14 }}>
            <label className="ft-label">Search</label>
            <input className="ft-input" placeholder="e.g. chicken" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label className="ft-label">Food</label>
            <select className="ft-select" value={selected} onChange={(e) => setSelected(e.target.value)}>
              {categories.map((cat) => {
                const items = filtered.filter((f) => f.cat === cat);
                if (items.length === 0) return null;
                return (
                  <optgroup key={cat} label={cat}>
                    {items.map((f) => <option key={f.name} value={f.name}>{f.name}</option>)}
                  </optgroup>
                );
              })}
            </select>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <label className="ft-label" style={{ marginBottom: 6 }}>Amount (grams)</label>
              {selectedFood?.serving && (
                <button
                  type="button"
                  onClick={() => setGrams(selectedFood.serving)}
                  style={{ fontSize: 11, color: "var(--work)", background: "transparent", border: "none", cursor: "pointer", padding: 0, marginBottom: 6 }}
                >
                  Typical serving: ~{selectedFood.serving}g
                </button>
              )}
            </div>
            <input className="ft-input" type="number" value={grams} onChange={(e) => setGrams(e.target.value)} />
          </div>
          <button className="ft-btn" style={{ width: "100%", justifyContent: "center" }} onClick={handleAdd}>
            <Plus size={15} /> Add to log
          </button>

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
            <div className="ft-label" style={{ marginBottom: 10 }}>Today's totals vs goal</div>
            <ProgressBar pct={(totals.cal / goals.calories) * 100} color="var(--cal)" label="Calories" sub={`${totals.cal} / ${goals.calories} kcal`} />
            <ProgressBar pct={(totals.p / goals.protein) * 100} color="var(--protein)" label="Protein" sub={`${totals.p}g / ${goals.protein}g`} />
            <ProgressBar pct={(totals.c / goals.carb) * 100} color="var(--carb)" label="Carbs" sub={`${totals.c}g / ${goals.carb}g`} />
            <ProgressBar pct={(totals.f / goals.fat) * 100} color="var(--fat)" label="Fat" sub={`${totals.f}g / ${goals.fat}g`} />
          </div>
        </div>

        <div className="ft-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <h3 className="ft-display" style={{ margin: 0, fontSize: 16 }}>Logged for {fmtShort(date)}</h3>
            {entries.length > 0 && (
              <ShareDownloadButtons
                onGetCanvas={() => drawInbodyCanvas({
                  title: "Food Log", subtitle: fmtShort(date),
                  rows: [
                    { label: "Total", value: `${entries.reduce((s, e) => s + e.cal, 0)} kcal` },
                    ...entries.map((e) => ({ label: `${e.food} (${e.grams}g)`, value: `${e.cal} kcal` })),
                  ],
                })}
                filename={`food-log-${date}.png`}
                shareTitle="My food log"
                shareText={`${entries.length} items logged, ${entries.reduce((s, e) => s + e.cal, 0)} kcal total`}
              />
            )}
          </div>
          {entries.length === 0 && <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>Nothing logged yet for this day.</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {entries.map((e) => (
              <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{e.food}</div>
                  <div className="ft-mono" style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                    {e.grams}g · <span style={{ color: "var(--work)" }}>{e.cal} kcal</span> · <span style={{ color: "var(--work)" }}>P</span>{e.p} <span style={{ color: "var(--work)" }}>C</span>{e.c} <span style={{ color: "var(--work)" }}>F</span>{e.f}
                  </div>
                </div>
                <button className="ft-btn-outline ft-btn" style={{ padding: 6 }} onClick={() => removeEntry(e.id)} aria-label="Remove entry">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Workout log screen                                                     */
/* ---------------------------------------------------------------------- */

function WorkoutLogScreen({ date, setDate, entries, addEntry, removeEntry, weightKg }) {
  const [type, setType] = useState(WORKOUT_TYPES[0].name);
  const [duration, setDuration] = useState(30);
  const [customCal, setCustomCal] = useState(200);
  const [distanceKm, setDistanceKm] = useState(5);
  const [effort, setEffort] = useState(70);
  const [proofImage, setProofImage] = useState(null);
  const [proofError, setProofError] = useState("");

  const handleProofFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setProofError("");
    if (!file.type.startsWith("image/")) {
      setProofError("Please choose an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setProofError("Image is too big — please use one under 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setProofImage(reader.result);
    reader.readAsDataURL(file);
  };

  const [showCustom, setShowCustom] = useState(false);
  const [customExercises, setCustomExercises] = useState([
    { id: "e1", name: "", reps: "", restSec: "", weight: "", timeMin: "", timeSec: "" },
  ]);
  const [customEffort, setCustomEffort] = useState(70);
  const [repeatSelection, setRepeatSelection] = useState({});

  const [showQuick, setShowQuick] = useState(false);
  const [quickName, setQuickName] = useState("");
  const [quickCal, setQuickCal] = useState("");
  const [quickEffort, setQuickEffort] = useState(70);

  const toggleRepeatSelect = (id) => {
    setRepeatSelection((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const addExerciseRow = () => {
    setCustomExercises((prev) => [...prev, { id: `e${Date.now()}`, name: "", reps: "", restSec: "", weight: "", timeMin: "", timeSec: "" }]);
  };
  const repeatExercises = () => {
    setCustomExercises((prev) => {
      const selected = prev.filter((ex) => ex.name.trim() && repeatSelection[ex.id]);
      if (selected.length === 0) return prev;
      const copies = selected.map((ex, i) => ({ ...ex, id: `e${Date.now()}-${i}` }));
      return [...prev, ...copies];
    });
  };
  const removeExerciseRow = (id) => {
    setCustomExercises((prev) => prev.filter((ex) => ex.id !== id));
  };
  const updateExerciseRow = (id, field, value) => {
    setCustomExercises((prev) => prev.map((ex) => (ex.id === id ? { ...ex, [field]: value } : ex)));
  };

  const handleAddCustom = () => {
    const valid = customExercises.filter((ex) => ex.name.trim());
    if (valid.length === 0) return;
    const totalDuration = valid.reduce((s, ex) => s + (Number(ex.timeMin) || 0) + (Number(ex.timeSec) || 0) / 60, 0);
    // strength training MET (5) as the base, scaled by effort like other workouts
    const baseCal = 5 * (weightKg || 75) * (totalDuration / 60);
    const calsBurned = Math.round(baseCal * (Number(customEffort) / 100));
    const points = Math.round(totalDuration * (Number(customEffort) / 100));
    addEntry({
      id: `${Date.now()}`,
      type: `Custom workout (${valid.length} exercise${valid.length > 1 ? "s" : ""})`,
      duration: Math.round(totalDuration),
      calsBurned,
      effort: Number(customEffort),
      points,
      exercises: valid.map((ex) => {
        const entry = { name: ex.name.trim() };
        if (ex.reps !== "" && ex.reps != null) entry.reps = Number(ex.reps);
        if (ex.timeMin !== "" && ex.timeMin != null) entry.timeMin = Number(ex.timeMin);
        if (ex.timeSec !== "" && ex.timeSec != null) entry.timeSec = Number(ex.timeSec);
        if (ex.weight !== "" && ex.weight != null) entry.weight = Number(ex.weight);
        if (ex.restSec !== "" && ex.restSec != null) entry.restSec = Number(ex.restSec);
        return entry;
      }),
    });
    setCustomExercises([{ id: `e${Date.now()}`, name: "", reps: "", restSec: "", weight: "", timeMin: "", timeSec: "" }]);
    setCustomEffort(70);
    setShowCustom(false);
  };

  const handleAddQuick = () => {
    if (!quickName.trim() || quickCal === "") return;
    addEntry({
      id: `${Date.now()}`,
      type: quickName.trim(),
      duration: 0,
      calsBurned: Number(quickCal),
      effort: Number(quickEffort),
    });
    setQuickName("");
    setQuickCal("");
    setQuickEffort(70);
    setShowQuick(false);
  };

  const selectedType = WORKOUT_TYPES.find((t) => t.name === type);

  const handleAdd = () => {
    const w = WORKOUT_TYPES.find((t) => t.name === type);
    let baseCal;
    let extra = {};
    if (w.distanceBased) {
      // ~1.036 kcal burned per kg of bodyweight per km run — a standard running estimate
      baseCal = Number(distanceKm) * (weightKg || 75) * 1.036;
      extra = { distanceKm: Number(distanceKm) };
    } else if (w.met === null) {
      baseCal = Number(customCal);
    } else {
      baseCal = w.met * (weightKg || 75) * (Number(duration) / 60);
    }
    // effort scales the calorie estimate — going at 50% effort burns roughly half what full effort would
    const calsBurned = Math.round(baseCal * (Number(effort) / 100));
    // training points: reward duration weighted by how hard you pushed
    const points = Math.round(Number(duration) * (Number(effort) / 100));
    if (proofImage) extra.proof = proofImage;
    addEntry({ id: `${Date.now()}`, type, duration: Number(duration), calsBurned, effort: Number(effort), points, ...extra });
    setProofImage(null);
  };

  const totalMinutes = entries.reduce((s, e) => s + e.duration, 0);
  const totalBurned = entries.reduce((s, e) => s + e.calsBurned, 0);
  const totalPoints = entries.reduce((s, e) => s + (e.points || 0), 0);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <Calendar size={16} />
        <input className="ft-input" style={{ width: 170 }} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="ft-responsive-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 20 }}>
        <div className="ft-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4, flexWrap: "wrap", gap: 8 }}>
            <h3 className="ft-display" style={{ margin: 0, fontSize: 16 }}>Log workout</h3>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="ft-btn-outline ft-btn" style={{ fontSize: 12, padding: "6px 10px" }} onClick={() => { setShowQuick(false); setShowCustom((s) => !s); }}>
                <Plus size={13} /> Custom workout
              </button>
              <button className="ft-btn-outline ft-btn" style={{ fontSize: 12, padding: "6px 10px" }} onClick={() => { setShowCustom(false); setShowQuick((s) => !s); }}>
                <Flame size={13} /> Quick log
              </button>
            </div>
          </div>

          {showQuick && (
            <div className="ft-card" style={{ background: "var(--bg)", padding: 12, marginTop: 10, marginBottom: 14 }}>
              <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: "0 0 10px" }}>
                Didn't track the exact workout? Just log a name and the calories you burned.
              </p>
              <div style={{ marginBottom: 10 }}>
                <label className="ft-label">Workout name</label>
                <input className="ft-input" placeholder="e.g. CrossFit" value={quickName} onChange={(e) => setQuickName(e.target.value)} />
              </div>
              <div style={{ marginBottom: 10 }}>
                <label className="ft-label">Calories burned</label>
                <input className="ft-input" type="number" placeholder="e.g. 400" value={quickCal} onChange={(e) => setQuickCal(e.target.value)} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label className="ft-label">Effort level — {quickEffort}%</label>
                <input
                  type="range" min="0" max="100" step="5" value={quickEffort}
                  onChange={(e) => setQuickEffort(e.target.value)}
                  style={{ width: "100%", accentColor: "var(--work)" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--ink-soft)" }}>
                  <span>Easy</span><span>All-out</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="ft-btn-outline ft-btn" style={{ flex: 1, justifyContent: "center" }} onClick={() => setShowQuick(false)}>Cancel</button>
                <button className="ft-btn" style={{ flex: 1, justifyContent: "center" }} disabled={!quickName.trim() || quickCal === ""} onClick={handleAddQuick}>Save workout</button>
              </div>
            </div>
          )}

          {showCustom && (
            <div className="ft-card" style={{ background: "var(--bg)", padding: 12, marginTop: 10, marginBottom: 14 }}>
              <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: "0 0 10px" }}>
                Build your own workout — add as many exercises as you like.
              </p>
              <div style={{ overflowX: "auto", marginBottom: 10 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 540 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--line-strong)" }}>
                      <th style={{ textAlign: "left", padding: "4px 6px", fontSize: 10, textTransform: "uppercase", color: "var(--ink-soft)", fontWeight: 500 }}>Exercise</th>
                      <th style={{ textAlign: "left", padding: "4px 6px", fontSize: 10, textTransform: "uppercase", color: "var(--ink-soft)", fontWeight: 500, width: 70 }}>Reps</th>
                      <th style={{ textAlign: "left", padding: "4px 6px", fontSize: 10, textTransform: "uppercase", color: "var(--ink-soft)", fontWeight: 500, width: 110 }}>Time (min : sec)</th>
                      <th style={{ textAlign: "left", padding: "4px 6px", fontSize: 10, textTransform: "uppercase", color: "var(--ink-soft)", fontWeight: 500, width: 80 }}>Weight (kg)</th>
                      <th style={{ textAlign: "left", padding: "4px 6px", fontSize: 10, textTransform: "uppercase", color: "var(--ink-soft)", fontWeight: 500, width: 80 }}>Rest (s)</th>
                      <th style={{ width: 30 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {customExercises.map((ex) => (
                      <tr key={ex.id} style={{ borderBottom: "1px solid var(--line)" }}>
                        <td style={{ padding: "4px 6px" }}>
                          <input className="ft-input" placeholder="e.g. Bench press" value={ex.name} onChange={(e) => updateExerciseRow(ex.id, "name", e.target.value)} />
                        </td>
                        <td style={{ padding: "4px 6px" }}>
                          <input className="ft-input" type="number" value={ex.reps} onChange={(e) => updateExerciseRow(ex.id, "reps", e.target.value)} />
                        </td>
                        <td style={{ padding: "4px 6px" }}>
                          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                            <input className="ft-input" type="number" placeholder="min" style={{ width: 52 }} value={ex.timeMin} onChange={(e) => updateExerciseRow(ex.id, "timeMin", e.target.value)} />
                            <input className="ft-input" type="number" placeholder="sec" style={{ width: 52 }} value={ex.timeSec} onChange={(e) => updateExerciseRow(ex.id, "timeSec", e.target.value)} />
                          </div>
                        </td>
                        <td style={{ padding: "4px 6px" }}>
                          <input className="ft-input" type="number" value={ex.weight} onChange={(e) => updateExerciseRow(ex.id, "weight", e.target.value)} />
                        </td>
                        <td style={{ padding: "4px 6px" }}>
                          <input className="ft-input" type="number" value={ex.restSec} onChange={(e) => updateExerciseRow(ex.id, "restSec", e.target.value)} />
                        </td>
                        <td style={{ padding: "4px 6px" }}>
                          <div style={{ display: "flex", gap: 4 }}>
                            <button
                              className="ft-btn-outline ft-btn"
                              style={{ padding: 5, borderColor: repeatSelection[ex.id] ? "var(--work)" : "var(--line-strong)", borderWidth: repeatSelection[ex.id] ? 2 : 1 }}
                              onClick={() => toggleRepeatSelect(ex.id)}
                              aria-label="Select for repeat"
                              title="Select to repeat"
                            >
                              <CheckCircle2 size={12} color={repeatSelection[ex.id] ? "var(--work)" : "var(--ink-soft)"} />
                            </button>
                            {customExercises.length > 1 && (
                              <button className="ft-btn-outline ft-btn" style={{ padding: 5 }} onClick={() => removeExerciseRow(ex.id)} aria-label="Remove exercise">
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button className="ft-btn-outline ft-btn" style={{ width: "100%", justifyContent: "center", marginBottom: 8 }} onClick={addExerciseRow}>
                <Plus size={13} /> Add another exercise
              </button>
              <button
                className="ft-btn-outline ft-btn"
                style={{ width: "100%", justifyContent: "center", marginBottom: 14 }}
                disabled={Object.values(repeatSelection).filter(Boolean).length === 0}
                onClick={repeatExercises}
              >
                <Repeat size={13} /> Repeat selected ({Object.values(repeatSelection).filter(Boolean).length})
              </button>

              <p style={{ fontSize: 11, color: "var(--ink-soft)", margin: "0 0 10px" }}>
                Total duration: <span className="ft-mono" style={{ color: "var(--ink)" }}>
                  {(() => {
                    const totalSec = Math.round(customExercises.reduce((s, ex) => s + (Number(ex.timeMin) || 0) * 60 + (Number(ex.timeSec) || 0), 0));
                    const m = Math.floor(totalSec / 60);
                    const s = totalSec % 60;
                    return s > 0 ? `${m}m ${s}s` : `${m} min`;
                  })()}
                </span> (summed from each exercise's time)
              </p>

              <div style={{ marginBottom: 10 }}>
                <label className="ft-label">Effort level — {customEffort}%</label>
                <input
                  type="range" min="0" max="100" step="5" value={customEffort}
                  onChange={(e) => setCustomEffort(e.target.value)}
                  style={{ width: "100%", accentColor: "var(--work)" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--ink-soft)" }}>
                  <span>Easy</span><span>All-out</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button className="ft-btn-outline ft-btn" style={{ flex: 1, justifyContent: "center" }} onClick={() => setShowCustom(false)}>Cancel</button>
                <button className="ft-btn" style={{ flex: 1, justifyContent: "center" }} onClick={handleAddCustom}>Save workout</button>
              </div>
            </div>
          )}

          <div style={{ marginTop: showCustom || showQuick ? 0 : 14 }}>
            <label className="ft-label">Type</label>
            <select className="ft-select" value={type} onChange={(e) => setType(e.target.value)}>
              {WORKOUT_TYPES.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label className="ft-label">Duration (minutes)</label>
            <input className="ft-input" type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
          </div>
          {selectedType?.distanceBased && (
            <div style={{ marginBottom: 10 }}>
              <label className="ft-label">Distance (km)</label>
              <input className="ft-input" type="number" step="0.1" value={distanceKm} onChange={(e) => setDistanceKm(e.target.value)} />
              <p style={{ fontSize: 11, color: "var(--ink-soft)", margin: "6px 0 0" }}>
                Calories are estimated from distance and your bodyweight (~1 kcal per kg per km) rather than pace.
              </p>
            </div>
          )}
          {selectedType?.met === null && !selectedType?.distanceBased && (
            <div style={{ marginBottom: 10 }}>
              <label className="ft-label">Calories burned</label>
              <input className="ft-input" type="number" value={customCal} onChange={(e) => setCustomCal(e.target.value)} />
            </div>
          )}
          <div style={{ marginBottom: 10 }}>
            <label className="ft-label">Effort level — {effort}%</label>
            <input
              type="range" min="0" max="100" step="5" value={effort}
              onChange={(e) => setEffort(e.target.value)}
              style={{ width: "100%", accentColor: "var(--work)" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--ink-soft)" }}>
              <span>Easy</span><span>All-out</span>
            </div>
            <p style={{ fontSize: 11, color: "var(--ink-soft)", margin: "6px 0 0" }}>
              How hard you actually pushed. Scales the calorie estimate and your training points.
            </p>
          </div>

          <div style={{ marginBottom: 10 }}>
            <input id="proof-upload-input" type="file" accept="image/*" onChange={handleProofFile} style={{ display: "none" }} />
            {proofImage ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <img src={proofImage} alt="Proof" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 4, border: "1px solid var(--line)" }} />
                <span style={{ fontSize: 12, color: "var(--ink-soft)", flex: 1 }}>Proof attached</span>
                <button type="button" className="ft-btn-outline ft-btn" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => setProofImage(null)}>
                  <Trash2 size={13} />
                </button>
              </div>
            ) : (
              <label htmlFor="proof-upload-input" className="ft-btn-outline ft-btn" style={{ width: "100%", justifyContent: "center", cursor: "pointer" }}>
                <Share2 size={13} /> Upload Proof
              </label>
            )}
            {proofError && <p style={{ fontSize: 11, color: "var(--warn)", margin: "6px 0 0" }}>{proofError}</p>}
          </div>

          <button className="ft-btn" style={{ width: "100%", justifyContent: "center", marginTop: 8 }} onClick={handleAdd}>
            <Plus size={15} /> Add workout
          </button>

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
            <div className="ft-label">Today</div>
            <div className="ft-mono" style={{ fontSize: 20, fontWeight: 600, marginTop: 4 }}>
              {totalMinutes} min · {totalBurned} kcal
            </div>
          </div>
        </div>

        <div className="ft-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <h3 className="ft-display" style={{ margin: 0, fontSize: 16 }}>Logged for {fmtShort(date)}</h3>
            {entries.length > 0 && (
              <ShareDownloadButtons
                onGetCanvas={() => drawInbodyCanvas({
                  title: "Workout Log", subtitle: fmtShort(date),
                  rows: [
                    { label: "Total", value: `${entries.reduce((s, e) => s + e.duration, 0)} min · ${entries.reduce((s, e) => s + e.calsBurned, 0)} kcal` },
                    ...entries.map((e) => ({ label: e.type, value: `${e.duration ? `${e.duration} min · ` : ""}${e.calsBurned} kcal` })),
                  ],
                })}
                filename={`workout-log-${date}.png`}
                shareTitle="My workout log"
                shareText={`${entries.length} workout${entries.length === 1 ? "" : "s"} logged`}
              />
            )}
          </div>
          {entries.length === 0 && <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>No workouts logged for this day.</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {entries.map((e) => (
              <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{e.type}</div>
                  <div className="ft-mono" style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                    {e.distanceKm ? `${e.distanceKm} km · ` : ""}{e.duration ? `${e.duration} min · ` : ""}{e.calsBurned} kcal
                    {e.effort != null && <> · <span style={{ color: "var(--work)" }}>{e.effort}% effort</span></>}
                  </div>
                  {e.exercises && (
                    <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 2 }}>
                      {e.exercises.map((ex, i) => {
                        const parts = [];
                        if (ex.reps != null) parts.push(`${ex.reps} reps`);
                        if (ex.timeMin != null && ex.timeSec != null) parts.push(`${ex.timeMin}m ${ex.timeSec}s`);
                        else if (ex.timeMin != null) parts.push(`${ex.timeMin} min`);
                        else if (ex.timeSec != null) parts.push(`${ex.timeSec} sec`);
                        if (ex.weight != null) parts.push(`${ex.weight}kg`);
                        if (ex.restSec != null) parts.push(`rest ${ex.restSec}s`);
                        return (
                          <div key={i} className="ft-mono" style={{ fontSize: 11, color: "var(--ink-soft)" }}>
                            {ex.name}{parts.length > 0 ? ` — ${parts.join(" · ")}` : ""}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {e.proof && (
                    <a href={e.proof} target="_blank" rel="noopener noreferrer">
                      <img src={e.proof} alt="Proof" style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 4, border: "1px solid var(--line)", marginTop: 8 }} />
                    </a>
                  )}
                </div>
                <button className="ft-btn-outline ft-btn" style={{ padding: 6, flexShrink: 0 }} onClick={() => removeEntry(e.id)} aria-label="Remove entry">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LogStepsScreen({ date, setDate, stepsByDate, setSteps, stepsGoal }) {
  const [stepsInput, setStepsInput] = useState((stepsByDate && stepsByDate[date]) || "");
  useEffect(() => { setStepsInput((stepsByDate && stepsByDate[date]) || ""); }, [date, stepsByDate]);

  const RANGE_BACK = 6;
  const dateList = Array.from({ length: RANGE_BACK + 1 }, (_, i) => todayStr(i - RANGE_BACK));
  const todayCount = (stepsByDate && stepsByDate[todayStr()]) || 0;
  const pct = stepsGoal ? Math.min(100, Math.round((todayCount / stepsGoal) * 100)) : 0;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h2 className="ft-display" style={{ margin: "0 0 4px", fontSize: 18 }}>Log steps</h2>
          <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: 0 }}>
            Track your daily step count against your target from the Goals tab.
          </p>
        </div>
        <ShareDownloadButtons
          onGetCanvas={() => drawInbodyCanvas({
            title: "Steps", subtitle: `Last 7 days · target ${stepsGoal || 8000}`,
            rows: dateList.slice().reverse().map((d) => ({
              label: fmtShort(d) + (d === todayStr() ? " (today)" : ""),
              value: `${(stepsByDate && stepsByDate[d]) || 0}`,
            })),
          })}
          filename={`steps-${todayStr()}.png`}
          shareTitle="My steps"
          shareText={`${todayCount} steps today, target ${stepsGoal || 8000}`}
        />
      </div>

      <div className="ft-responsive-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 20 }}>
        <div className="ft-card">
          <h3 className="ft-display" style={{ marginTop: 0, fontSize: 16 }}>Enter steps</h3>
          <div style={{ marginBottom: 14 }}>
            <label className="ft-label">Date</label>
            <input className="ft-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label className="ft-label">Steps for {fmtShort(date)}</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input className="ft-input" type="number" placeholder={`Target ${stepsGoal || 8000}`} value={stepsInput} onChange={(e) => setStepsInput(e.target.value)} />
              <button className="ft-btn" onClick={() => setSteps(stepsInput)}>Save</button>
            </div>
          </div>

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
            <div className="ft-label" style={{ marginBottom: 6 }}>Today</div>
            <ProgressBar
              pct={pct}
              color={pct >= 100 ? "var(--good)" : pct >= 60 ? "var(--carb)" : "var(--warn)"}
              label="Steps"
              sub={`${todayCount} / ${stepsGoal || 8000}`}
            />
          </div>
        </div>

        <div className="ft-card">
          <h3 className="ft-display" style={{ marginTop: 0, fontSize: 16 }}>Last 7 days</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {dateList.slice().reverse().map((d) => {
              const count = (stepsByDate && stepsByDate[d]) || 0;
              const dPct = stepsGoal ? Math.min(100, Math.round((count / stepsGoal) * 100)) : 0;
              return (
                <div key={d} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: "1px solid var(--line)" }}>
                  <span style={{ fontSize: 12, width: 70, color: "var(--ink-soft)" }}>{fmtShort(d)}{d === todayStr() ? " · today" : ""}</span>
                  <div style={{ flex: 1, height: 8, background: "var(--line)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${dPct}%`, background: dPct >= 100 ? "var(--good)" : dPct > 0 ? "var(--carb)" : "var(--line)" }} />
                  </div>
                  <span className="ft-mono" style={{ fontSize: 12, width: 60, textAlign: "right" }}>{count > 0 ? count : "—"}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Fitness test screen                                                    */
/* ---------------------------------------------------------------------- */

const TEST_UNITS = [
  { value: "reps", label: "reps" },
  { value: "time", label: "time (min:sec)" },
  { value: "kg", label: "kg" },
  { value: "distance", label: "distance (km + m)" },
];

function formatTime(totalSec) {
  const m = Math.floor(totalSec / 60);
  const s = Math.round(totalSec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDistance(totalMeters) {
  const km = Math.floor(totalMeters / 1000);
  const m = Math.round(totalMeters % 1000);
  if (km === 0) return `${m} m`;
  if (m === 0) return `${km} km`;
  return `${km} km ${m} m`;
}

function MiniTrendChart({ title, data, dataKey, color, unit, hideTitle = false }) {
  return (
    <div className="ft-card" style={{ padding: 12 }}>
      {!hideTitle && <div className="ft-label" style={{ marginBottom: 6 }}>{title}</div>}
      <div style={{ height: 150 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--ink-soft)" }} />
            <YAxis tick={{ fontSize: 10, fill: "var(--ink-soft)" }} domain={["auto", "auto"]} />
            <Tooltip formatter={(v) => [`${v}${unit}`, title]} />
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function drawInbodyCanvas({ title, subtitle, rows }) {
  const canvas = document.createElement("canvas");
  const W = 800, H = 620;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#DADAD5"; ctx.lineWidth = 2; ctx.strokeRect(20, 20, W - 40, H - 40);

  ctx.textAlign = "center";
  ctx.fillStyle = "#1E1E1C"; ctx.font = "600 14px Inter, sans-serif";
  ctx.fillText("FIT DATA", W / 2, 70);
  ctx.fillStyle = "#141414"; ctx.font = "700 28px Georgia, serif";
  ctx.fillText(title, W / 2, 108);
  if (subtitle) {
    ctx.font = "400 14px Inter, sans-serif"; ctx.fillStyle = "#1E1E1C";
    ctx.fillText(subtitle, W / 2, 132);
  }
  ctx.strokeStyle = "#141414"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(60, 150); ctx.lineTo(W - 60, 150); ctx.stroke();

  let y = 210;
  rows.forEach((r) => {
    ctx.strokeStyle = "#DADAD5"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(60, y + 30); ctx.lineTo(W - 60, y + 30); ctx.stroke();
    ctx.textAlign = "left"; ctx.fillStyle = "#1E1E1C"; ctx.font = "500 16px Inter, sans-serif";
    ctx.fillText(r.label, 60, y);
    ctx.textAlign = "right"; ctx.fillStyle = "#141414"; ctx.font = "700 20px 'IBM Plex Mono', monospace";
    ctx.fillText(r.value, W - 60, y + 2);
    y += 58;
  });

  ctx.textAlign = "center"; ctx.fillStyle = "#1E1E1C"; ctx.font = "400 11px Inter, sans-serif";
  ctx.fillText("Made with FIT DATA", W / 2, H - 30);

  return canvas;
}

function InBodyBlock({ scans, addScan, removeScan }) {
  const [form, setForm] = useState({ weight: "", muscleMass: "", fatMass: "", fatPct: "" });

  const handleSave = () => {
    if (!form.weight && !form.muscleMass && !form.fatMass && !form.fatPct) return;
    addScan({
      id: `${Date.now()}`, date: todayStr(),
      weight: Number(form.weight) || 0,
      muscleMass: Number(form.muscleMass) || 0,
      fatMass: Number(form.fatMass) || 0,
      fatPct: Number(form.fatPct) || 0,
    });
    setForm({ weight: "", muscleMass: "", fatMass: "", fatPct: "" });
  };

  const sorted = scans.slice().sort((a, b) => a.date.localeCompare(b.date));
  const chartData = sorted.map((s) => ({ date: fmtShort(s.date), Weight: s.weight, Muscle: s.muscleMass, FatMass: s.fatMass, FatPct: s.fatPct }));
  const latest = sorted[sorted.length - 1];

  const handleShare = () => {
    if (!latest) return;
    const canvas = drawInbodyCanvas({
      title: "InBody Results",
      subtitle: fmtShort(latest.date),
      rows: [
        { label: "Weight", value: `${latest.weight} kg` },
        { label: "Skeletal muscle mass", value: `${latest.muscleMass} kg` },
        { label: "Fat mass", value: `${latest.fatMass} kg` },
        { label: "Body fat percentage", value: `${latest.fatPct}%` },
      ],
    });
    shareOrDownloadCanvas(canvas, `inbody-results-${latest.date}.png`, "My InBody results", `Weight ${latest.weight}kg · Muscle ${latest.muscleMass}kg · Fat ${latest.fatPct}%`);
  };

  return (
    <>
      <div className="ft-card no-print" style={{ marginTop: 24 }}>
        <h2 className="ft-display" style={{ margin: "0 0 4px", fontSize: 18 }}>InBody results</h2>
        <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: "0 0 16px" }}>
          Log your body composition scan results to track how they change over time.
        </p>

        <div className="ft-responsive-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div className="ft-card">
            <div>
              <label className="ft-label">Weight (kg)</label>
              <input className="ft-input" type="number" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} style={{ marginBottom: 12 }} />
            </div>
            <div>
              <label className="ft-label">Skeletal muscle mass (kg)</label>
              <input className="ft-input" type="number" value={form.muscleMass} onChange={(e) => setForm({ ...form, muscleMass: e.target.value })} style={{ marginBottom: 12 }} />
            </div>
            <div>
              <label className="ft-label">Fat mass (kg)</label>
              <input className="ft-input" type="number" value={form.fatMass} onChange={(e) => setForm({ ...form, fatMass: e.target.value })} style={{ marginBottom: 12 }} />
            </div>
            <div>
              <label className="ft-label">Body fat percentage (%)</label>
              <input className="ft-input" type="number" value={form.fatPct} onChange={(e) => setForm({ ...form, fatPct: e.target.value })} style={{ marginBottom: 12 }} />
            </div>
            <button className="ft-btn" style={{ justifyContent: "center", width: "100%", marginTop: 4 }} onClick={handleSave}>
              <Plus size={15} /> Save InBody result
            </button>
          </div>

          <div className="ft-card">
            {latest ? (
              <>
                <h3 className="ft-display" style={{ marginTop: 0, fontSize: 16 }}>Latest ({fmtShort(latest.date)})</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}><span style={{ color: "var(--ink-soft)" }}>Weight</span><span className="ft-mono" style={{ fontWeight: 600 }}>{latest.weight} kg</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}><span style={{ color: "var(--ink-soft)" }}>Skeletal muscle mass</span><span className="ft-mono" style={{ fontWeight: 600 }}>{latest.muscleMass} kg</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}><span style={{ color: "var(--ink-soft)" }}>Fat mass</span><span className="ft-mono" style={{ fontWeight: 600 }}>{latest.fatMass} kg</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}><span style={{ color: "var(--ink-soft)" }}>Body fat %</span><span className="ft-mono" style={{ fontWeight: 600 }}>{latest.fatPct}%</span></div>
                </div>
              </>
            ) : (
              <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: 0 }}>Log your first scan to see a summary here.</p>
            )}
          </div>
        </div>
      </div>

      <div className="ft-card print-area" style={{ marginTop: 20 }}>
        <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <h2 className="ft-display" style={{ margin: 0, fontSize: 18 }}>InBody trends</h2>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button className="ft-btn-outline ft-btn" style={{ fontSize: 12 }} disabled={!latest} onClick={handleShare}>
              <Share2 size={13} /> Share
            </button>
            <button className="ft-btn" style={{ fontSize: 12 }} onClick={() => window.print()}>Download / Print</button>
          </div>
        </div>

        {chartData.length > 1 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20 }}>
            <MiniTrendChart title="Weight" data={chartData} dataKey="Weight" color="var(--cal)" unit="kg" />
            <MiniTrendChart title="Skeletal muscle mass" data={chartData} dataKey="Muscle" color="var(--protein)" unit="kg" />
            <MiniTrendChart title="Fat mass" data={chartData} dataKey="FatMass" color="var(--work)" unit="kg" />
            <MiniTrendChart title="Body fat percentage" data={chartData} dataKey="FatPct" color="var(--warn)" unit="%" />
          </div>
        ) : (
          <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 20 }}>Log at least two scans to see trend charts.</p>
        )}

        {sorted.length > 0 && (
          <div style={{ marginTop: 20, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line-strong)" }}>
                  <th style={{ textAlign: "left", padding: "6px 8px", fontSize: 10, textTransform: "uppercase", color: "var(--ink-soft)" }}>Date</th>
                  <th style={{ textAlign: "right", padding: "6px 8px", fontSize: 10, textTransform: "uppercase", color: "var(--ink-soft)" }}>Weight</th>
                  <th style={{ textAlign: "right", padding: "6px 8px", fontSize: 10, textTransform: "uppercase", color: "var(--ink-soft)" }}>Muscle</th>
                  <th style={{ textAlign: "right", padding: "6px 8px", fontSize: 10, textTransform: "uppercase", color: "var(--ink-soft)" }}>Fat mass</th>
                  <th style={{ textAlign: "right", padding: "6px 8px", fontSize: 10, textTransform: "uppercase", color: "var(--ink-soft)" }}>Fat %</th>
                  <th style={{ width: 30 }}></th>
                </tr>
              </thead>
              <tbody>
                {sorted.slice().reverse().map((s) => (
                  <tr key={s.id} style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "6px 8px" }}>{fmtShort(s.date)}</td>
                    <td className="ft-mono" style={{ padding: "6px 8px", textAlign: "right" }}>{s.weight}kg</td>
                    <td className="ft-mono" style={{ padding: "6px 8px", textAlign: "right" }}>{s.muscleMass}kg</td>
                    <td className="ft-mono" style={{ padding: "6px 8px", textAlign: "right" }}>{s.fatMass}kg</td>
                    <td className="ft-mono" style={{ padding: "6px 8px", textAlign: "right" }}>{s.fatPct}%</td>
                    <td style={{ padding: "6px 8px" }}>
                      <button className="ft-btn-outline ft-btn" style={{ padding: 4 }} onClick={() => removeScan(s.id)} aria-label="Remove scan">
                        <Trash2 size={11} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

const COMMON_MEASUREMENTS = ["Waist", "Chest", "Hips", "Bicep (left)", "Bicep (right)", "Thigh (left)", "Thigh (right)", "Calf", "Neck", "Shoulders"];

function MeasurementsBlock({ measurements, addMeasurement, removeMeasurement }) {
  const [form, setForm] = useState({ name: COMMON_MEASUREMENTS[0], customName: "", valueCm: "" });
  const [useCustom, setUseCustom] = useState(false);

  const handleSave = () => {
    const name = useCustom ? form.customName.trim() : form.name;
    if (!name || !form.valueCm) return;
    addMeasurement({ id: `${Date.now()}`, date: todayStr(), name, valueCm: Number(form.valueCm) });
    setForm({ ...form, valueCm: "" });
  };

  const grouped = useMemo(() => {
    const map = {};
    measurements.forEach((m) => {
      if (!map[m.name]) map[m.name] = [];
      map[m.name].push(m);
    });
    Object.values(map).forEach((arr) => arr.sort((a, b) => a.date.localeCompare(b.date)));
    return map;
  }, [measurements]);

  const names = Object.keys(grouped).sort();

  return (
    <div className="ft-card" style={{ marginTop: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 className="ft-display" style={{ margin: "0 0 4px", fontSize: 18 }}>Measurements</h2>
          <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: "0 0 16px" }}>
            Track body measurements in cm — waist, chest, arms, and more — to see how they change over time.
          </p>
        </div>
        {names.length > 0 && (
          <ShareDownloadButtons
            onGetCanvas={() => drawInbodyCanvas({
              title: "Measurements",
              subtitle: new Date().toLocaleDateString(),
              rows: names.map((name) => {
                const entries = grouped[name];
                const latest = entries[entries.length - 1];
                return { label: `${name} (${fmtShort(latest.date)})`, value: `${latest.valueCm} cm` };
              }),
            })}
            filename={`measurements-${todayStr()}.png`}
            shareTitle="My measurements"
            shareText={names.map((name) => `${name}: ${grouped[name][grouped[name].length - 1].valueCm}cm`).join(", ")}
          />
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 320, marginBottom: 20 }}>
        <div>
          <label className="ft-label">Measurement</label>
          {useCustom ? (
            <input className="ft-input" placeholder="e.g. Forearm" value={form.customName} onChange={(e) => setForm({ ...form, customName: e.target.value })} />
          ) : (
            <select className="ft-select" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}>
              {COMMON_MEASUREMENTS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          )}
          <button
            className="ft-btn-outline ft-btn"
            style={{ fontSize: 11, padding: "4px 8px", marginTop: 6 }}
            onClick={() => setUseCustom((v) => !v)}
          >
            {useCustom ? "Choose from list" : "+ Custom measurement"}
          </button>
        </div>
        <div>
          <label className="ft-label">Value (cm)</label>
          <input className="ft-input" type="number" value={form.valueCm} onChange={(e) => setForm({ ...form, valueCm: e.target.value })} />
        </div>
        <button className="ft-btn" style={{ justifyContent: "center" }} onClick={handleSave}>
          <Plus size={15} /> Add measurement
        </button>
      </div>

      {names.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>No measurements logged yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {names.map((name) => {
            const entries = grouped[name];
            const latest = entries[entries.length - 1];
            const chartData = entries.map((e) => ({ date: fmtShort(e.date), Value: e.valueCm }));
            return (
              <div key={name} className="ft-card" style={{ background: "var(--bg)", padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{name}</h3>
                  <span className="ft-mono" style={{ fontSize: 16, fontWeight: 700, color: "var(--work)" }}>{latest.valueCm} cm</span>
                </div>
                {chartData.length > 1 && (
                  <MiniTrendChart title={name} data={chartData} dataKey="Value" color="var(--work)" unit="cm" hideTitle />
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
                  {entries.slice().reverse().slice(0, 5).map((e) => (
                    <div key={e.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--ink-soft)" }}>
                      <span>{fmtShort(e.date)}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="ft-mono">{e.valueCm} cm</span>
                        <button className="ft-btn-outline ft-btn" style={{ padding: 3 }} onClick={() => removeMeasurement(e.id)} aria-label="Remove measurement">
                          <Trash2 size={10} />
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


function FitnessTestScreen({ exercises, addExercise, removeExercise, results, addResult }) {
  const [showAdd, setShowAdd] = useState(false);

  const [newEx, setNewEx] = useState({ name: "", unit: "reps", note: "" });

  const handleAddExercise = () => {
    if (!newEx.name.trim()) return;
    addExercise({ id: `${Date.now()}`, name: newEx.name.trim(), unit: newEx.unit, note: newEx.note.trim() });
    setNewEx({ name: "", unit: "reps", note: "" });
    setShowAdd(false);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 className="ft-display" style={{ margin: 0, fontSize: 18 }}>Fitness test</h2>
          <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: "4px 0 0" }}>
            Add any exercise you want to track and log results over time.
          </p>
        </div>
        <button className="ft-btn" onClick={() => setShowAdd((s) => !s)}>
          <Plus size={15} /> Add exercise
        </button>
      </div>

      {showAdd && (
        <div className="ft-card" style={{ marginBottom: 20, maxWidth: 420 }}>
          <h3 className="ft-display" style={{ marginTop: 0, fontSize: 15 }}>New exercise</h3>
          <div style={{ marginBottom: 10 }}>
            <label className="ft-label">Exercise name</label>
            <input className="ft-input" placeholder="e.g. Push-ups" value={newEx.name} onChange={(e) => setNewEx({ ...newEx, name: e.target.value })} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label className="ft-label">Unit</label>
            <select className="ft-select" value={newEx.unit} onChange={(e) => setNewEx({ ...newEx, unit: e.target.value })}>
              {TEST_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label className="ft-label">Note (optional)</label>
            <input className="ft-input" placeholder="e.g. focus on form, do before running" value={newEx.note} onChange={(e) => setNewEx({ ...newEx, note: e.target.value })} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="ft-btn-outline ft-btn" style={{ flex: 1, justifyContent: "center" }} onClick={() => setShowAdd(false)}>Cancel</button>
            <button className="ft-btn" style={{ flex: 1, justifyContent: "center" }} disabled={!newEx.name.trim()} onClick={handleAddExercise}>Add</button>
          </div>
        </div>
      )}

      {exercises.length === 0 ? (
        <div className="ft-card">
          <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: 0 }}>
            No exercises yet — click "Add exercise" to start tracking something like push-ups, plank hold, 1-mile time, or a lift.
          </p>
        </div>
      ) : (
        <div className="ft-responsive-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {exercises.map((ex) => (
            <FitnessExerciseCard
              key={ex.id}
              exercise={ex}
              results={(results[ex.id] || [])}
              onLog={(value, comment) => addResult(ex.id, { date: todayStr(), value: Number(value), comment: (comment || "").trim() })}
              onRemove={() => removeExercise(ex.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FitnessExerciseCard({ exercise, results, onLog, onRemove }) {
  const isTime = exercise.unit === "time";
  const isDistance = exercise.unit === "distance";
  const [value, setValue] = useState("");
  const [mins, setMins] = useState("");
  const [secs, setSecs] = useState("");
  const [km, setKm] = useState("");
  const [m, setM] = useState("");
  const [comment, setComment] = useState("");
  const sorted = results.slice().sort((a, b) => a.date.localeCompare(b.date));
  const chartData = sorted.map((r) => ({ date: fmtShort(r.date), value: r.value }));
  const latest = sorted[sorted.length - 1];

  const displayValue = (v) => (isTime ? formatTime(v) : isDistance ? formatDistance(v) : `${v} ${exercise.unit}`);

  const handleLog = () => {
    if (isTime) {
      const total = (Number(mins) || 0) * 60 + (Number(secs) || 0);
      if (total <= 0) return;
      onLog(total, comment);
      setMins(""); setSecs("");
    } else if (isDistance) {
      const total = (Number(km) || 0) * 1000 + (Number(m) || 0);
      if (total <= 0) return;
      onLog(total, comment);
      setKm(""); setM("");
    } else {
      if (!value) return;
      onLog(value, comment);
      setValue("");
    }
    setComment("");
  };

  return (
    <div className="ft-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
        <div>
          <h3 className="ft-display" style={{ margin: 0, fontSize: 15 }}>{exercise.name}</h3>
          <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: "2px 0 0" }}>Unit: {isTime ? "time (min:sec)" : isDistance ? "distance (km + m)" : exercise.unit}</p>
          {exercise.note && <p style={{ fontSize: 11, color: "var(--ink-soft)", margin: "2px 0 0", fontStyle: "italic" }}>{exercise.note}</p>}
        </div>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          {sorted.length > 0 && (
            <ShareDownloadButtons
              onGetCanvas={() => drawInbodyCanvas({
                title: exercise.name, subtitle: latest ? `Latest: ${fmtShort(latest.date)}` : undefined,
                rows: sorted.slice().reverse().slice(0, 8).map((r) => ({ label: fmtShort(r.date), value: displayValue(r.value) })),
              })}
              filename={`${exercise.name.replace(/\s+/g, "-").toLowerCase()}-results.png`}
              shareTitle={exercise.name}
              shareText={latest ? `Latest: ${displayValue(latest.value)}` : ""}
            />
          )}
          <button className="ft-btn-outline ft-btn" style={{ padding: 6 }} onClick={onRemove} aria-label="Remove exercise">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {isTime ? (
        <div style={{ display: "flex", gap: 8, marginTop: 12, marginBottom: 8, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <label className="ft-label">Minutes</label>
            <input className="ft-input" type="number" placeholder="30" value={mins} onChange={(e) => setMins(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="ft-label">Seconds</label>
            <input className="ft-input" type="number" placeholder="20" value={secs} onChange={(e) => setSecs(e.target.value)} />
          </div>
          <button className="ft-btn" disabled={!mins && !secs} onClick={handleLog}>
            <Trophy size={14} /> Log
          </button>
        </div>
      ) : isDistance ? (
        <div style={{ display: "flex", gap: 8, marginTop: 12, marginBottom: 8, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <label className="ft-label">Km</label>
            <input className="ft-input" type="number" placeholder="5" value={km} onChange={(e) => setKm(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="ft-label">Meters</label>
            <input className="ft-input" type="number" placeholder="200" value={m} onChange={(e) => setM(e.target.value)} />
          </div>
          <button className="ft-btn" disabled={!km && !m} onClick={handleLog}>
            <Trophy size={14} /> Log
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, marginTop: 12, marginBottom: 8 }}>
          <input className="ft-input" type="number" placeholder={`Result (${exercise.unit})`} value={value} onChange={(e) => setValue(e.target.value)} />
          <button className="ft-btn" disabled={!value} onClick={handleLog}>
            <Trophy size={14} /> Log
          </button>
        </div>
      )}
      <input
        className="ft-input"
        placeholder="Comment (optional) — how did it feel, form notes, etc."
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        style={{ marginBottom: 12 }}
      />

      {latest ? (
        <div className="ft-card" style={{ background: "var(--bg)", padding: 10 }}>
          <div className="ft-label" style={{ margin: 0 }}>Latest ({fmtShort(latest.date)})</div>
          <div className="ft-mono" style={{ fontSize: 20, fontWeight: 600, marginTop: 2, color: "var(--work)" }}>{displayValue(latest.value)}</div>
        </div>
      ) : (
        <p style={{ fontSize: 12, color: "var(--ink-soft)" }}>No results logged yet.</p>
      )}

      {chartData.length > 1 && (
        <div style={{ height: 140, marginTop: 10 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--ink-soft)" }} />
              <YAxis tick={{ fontSize: 10, fill: "var(--ink-soft)" }} tickFormatter={isTime ? formatTime : isDistance ? formatDistance : undefined} />
              <Tooltip formatter={(v) => [displayValue(v), exercise.name]} />
              <Line type="monotone" dataKey="value" stroke="var(--work)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {sorted.length > 0 && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
          {sorted.slice().reverse().slice(0, 4).map((r, i) => (
            <div key={i} style={{ borderBottom: "1px solid var(--line)", padding: "4px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "var(--ink-soft)" }}>{fmtShort(r.date)}</span>
                <span className="ft-mono">{displayValue(r.value)}</span>
              </div>
              {r.comment && (
                <p style={{ fontSize: 11, color: "var(--ink-soft)", margin: "2px 0 0", fontStyle: "italic" }}>{r.comment}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Dashboard                                                              */
/* ---------------------------------------------------------------------- */

/* Schedule strip: horizontal date rail + per-day nutrition/training rows,
   styled after a booking-calendar schedule view */
/* ---------------------------------------------------------------------- */
/* Report: bucketing helpers + status + chart + panel                     */
/* ---------------------------------------------------------------------- */

function isoWeekKey(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - onejan) / 86400000 + onejan.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${week}`;
}
function weekLabelFromKey(k) { return `Wk ${k.split("-W")[1]}`; }
function monthKey(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabelFromKey(k) {
  const [y, m] = k.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(undefined, { month: "short" });
}
function quarterKey(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
}
function quarterLabelFromKey(k) { return k.replace("-", " "); }

function buildReportBuckets(rawSeries, range) {
  let subset = rawSeries, bucketFn, labelFn;
  const today = new Date(todayStr() + "T00:00:00");

  if (range === "daily") {
    subset = rawSeries.slice(-14);
    bucketFn = (d) => d;
    labelFn = (k) => fmtShort(k);
  } else if (range === "weekly") {
    subset = rawSeries.slice(-70);
    bucketFn = isoWeekKey;
    labelFn = weekLabelFromKey;
  } else if (range === "monthly") {
    subset = rawSeries.slice(-182);
    bucketFn = monthKey;
    labelFn = monthLabelFromKey;
  } else if (range === "quarterly") {
    subset = rawSeries.slice(-365);
    bucketFn = quarterKey;
    labelFn = quarterLabelFromKey;
  } else {
    const jan1 = new Date(today.getFullYear(), 0, 1);
    const daysSinceJan1 = Math.round((today - jan1) / 86400000) + 1;
    subset = rawSeries.slice(-daysSinceJan1);
    bucketFn = monthKey;
    labelFn = monthLabelFromKey;
  }

  const buckets = {};
  if (range === "yearly") {
    const year = today.getFullYear();
    for (let m = 1; m <= 12; m++) {
      const k = `${year}-${String(m).padStart(2, "0")}`;
      buckets[k] = { key: k, days: 0, cal: 0, p: 0, c: 0, f: 0, loggedDays: 0, workoutSessions: 0, steps: 0, stepsLoggedDays: 0 };
    }
  }
  subset.forEach((r) => {
    const k = bucketFn(r.date);
    if (!buckets[k]) buckets[k] = { key: k, days: 0, cal: 0, p: 0, c: 0, f: 0, loggedDays: 0, workoutSessions: 0, steps: 0, stepsLoggedDays: 0 };
    const b = buckets[k];
    b.days += 1;
    b.cal += r.cal; b.p += r.p; b.c += r.c; b.f += r.f;
    if (r.cal > 0) b.loggedDays += 1;
    b.workoutSessions += r.workoutCount > 0 ? 1 : 0;
    b.steps += r.steps;
    if (r.steps > 0) b.stepsLoggedDays += 1;
  });

  return Object.keys(buckets).sort().map((k) => {
    const b = buckets[k];
    return {
      label: labelFn(k), key: k, days: b.days, loggedDays: b.loggedDays,
      calAvg: b.loggedDays > 0 ? Math.round(b.cal / b.loggedDays) : 0,
      pAvg: b.loggedDays > 0 ? Math.round(b.p / b.loggedDays) : 0,
      cAvg: b.loggedDays > 0 ? Math.round(b.c / b.loggedDays) : 0,
      fAvg: b.loggedDays > 0 ? Math.round(b.f / b.loggedDays) : 0,
      workoutSessions: b.workoutSessions,
      weeklySessions: Math.round((b.workoutSessions / (Math.max(1, b.days) / 7)) * 10) / 10,
      stepsLoggedDays: b.stepsLoggedDays,
      stepsAvg: b.stepsLoggedDays > 0 ? Math.round(b.steps / b.stepsLoggedDays) : 0,
    };
  });
}

function targetStatus3(value, target, loggedDays) {
  if (loggedDays === 0) return { label: "Not logged", color: "var(--line-strong)" };
  if (!target) return { label: "No target", color: "var(--ink-soft)" };
  const pct = (value / target) * 100;
  if (pct > 110) return { label: "Over", color: "var(--warn)" };
  if (pct < 90) return { label: "Under", color: "var(--carb)" };
  return { label: "Met", color: "var(--good)" };
}
function targetStatus2(value, target, hasData) {
  if (!hasData) return { label: "Not logged", color: "var(--line-strong)" };
  if (!target) return { label: "No target", color: "var(--ink-soft)" };
  return value >= target * 0.9 ? { label: "Achieved", color: "var(--good)" } : { label: "Missed", color: "var(--warn)" };
}

function ReportChart({ title, data, dataKey, target, targetKey, unit, colorFn }) {
  return (
    <div className="ft-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <h4 className="ft-display" style={{ margin: 0, fontSize: 14 }}>{title}</h4>
        {target ? <span className="ft-mono" style={{ fontSize: 11, color: "var(--ink-soft)" }}>target {target}{unit}</span> : null}
      </div>
      <div style={{ height: 170 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--ink-soft)" }} interval={data.length > 10 ? Math.floor(data.length / 8) : 0} />
            <YAxis tick={{ fontSize: 10, fill: "var(--ink-soft)" }} />
            <Tooltip formatter={(v) => [`${v}${unit}`, title]} />
            {targetKey ? (
              <Line type="stepAfter" dataKey={targetKey} stroke="var(--work)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} legendType="none" />
            ) : target ? (
              <ReferenceLine y={target} stroke="var(--work)" strokeDasharray="4 4" />
            ) : null}
            <Bar dataKey={dataKey} radius={[3, 3, 0, 0]}>
              {data.map((d, i) => <Cell key={i} fill={colorFn(d)} />)}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const RANGE_OPTS = [
  { v: "daily", label: "Daily" },
  { v: "weekly", label: "Weekly" },
  { v: "monthly", label: "Monthly" },
  { v: "quarterly", label: "Quarterly" },
  { v: "yearly", label: "This Year" },
];

function ReportPanel({ rawSeries, goals }) {
  const [range, setRange] = useState("daily");
  const chartsRef = useRef(null);
  const buckets = useMemo(() => buildReportBuckets(rawSeries, range), [range, JSON.stringify(rawSeries)]);
  const bucketsWithWorkoutTarget = useMemo(
    () => buckets.map((b) => ({ ...b, workoutTarget: Math.round((goals.workoutsPerMonth || 0) * (b.days / 30) * 10) / 10 })),
    [buckets, goals.workoutsPerMonth]
  );

  const summary = useMemo(() => {
    const totalLoggedDays = buckets.reduce((s, b) => s + b.loggedDays, 0);
    if (totalLoggedDays === 0) return { achieved: [], missed: [], noData: true };

    const metRate = (key, target) => {
      let hit = 0, total = 0;
      buckets.forEach((b) => {
        if (b.loggedDays > 0) { total++; const pct = (b[key] / target) * 100; if (pct >= 90 && pct <= 110) hit++; }
      });
      return total > 0 ? hit / total : null;
    };
    const workoutRate = () => {
      let hit = 0, total = 0;
      buckets.forEach((b) => {
        if (b.days > 0 && goals.workoutsPerMonth) {
          total++;
          const proratedTarget = goals.workoutsPerMonth * (b.days / 30);
          if (b.workoutSessions >= proratedTarget * 0.9) hit++;
        }
      });
      return total > 0 ? hit / total : null;
    };
    const stepsRate = () => {
      let hit = 0, total = 0;
      buckets.forEach((b) => { if (b.stepsLoggedDays > 0) { total++; if (b.stepsAvg >= goals.steps * 0.9) hit++; } });
      return total > 0 ? hit / total : null;
    };

    const rates = {
      Calories: metRate("calAvg", goals.calories),
      Protein: metRate("pAvg", goals.protein),
      Carbs: metRate("cAvg", goals.carb),
      Fat: metRate("fAvg", goals.fat),
      Workouts: workoutRate(),
      Steps: stepsRate(),
    };
    const achieved = [], missed = [];
    Object.entries(rates).forEach(([k, rate]) => {
      if (rate === null) return;
      (rate >= 0.6 ? achieved : missed).push(k);
    });
    return { achieved, missed, noData: false };
  }, [buckets, goals]);

  const periodWord = { daily: "two weeks", weekly: "ten weeks", monthly: "six months", quarterly: "year", yearly: "year" }[range];

  let message;
  if (summary.noData) {
    message = "No data logged for this period yet — log food, workouts and steps to start seeing how you're tracking against your goals.";
  } else if (summary.missed.length === 0) {
    message = `Well done — you hit your ${summary.achieved.join(", ")} goals across the last ${periodWord}. Keep this up!`;
  } else if (summary.achieved.length === 0) {
    message = `This ${periodWord} was tough on ${summary.missed.join(", ")} — no shame in that. Let's focus more there next period; small consistent changes beat big swings.`;
  } else {
    message = `Well done for hitting your ${summary.achieved.join(", ")} goals over the last ${periodWord}. Those weren't achieved — ${summary.missed.join(", ")} — let's focus more there.`;
  }

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <h2 className="ft-display" style={{ margin: 0, fontSize: 18 }}>Report</h2>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {RANGE_OPTS.map((o) => (
            <button
              key={o.v}
              className="ft-btn-outline ft-btn"
              style={{ fontSize: 12, padding: "6px 12px", borderColor: range === o.v ? "var(--ink)" : "var(--line-strong)", borderWidth: range === o.v ? 2 : 1 }}
              onClick={() => setRange(o.v)}
            >
              {o.label}
            </button>
          ))}
          <ShareDownloadButtons
            onGetCanvas={() =>
              captureElementCanvas(chartsRef.current, { title: `Report — ${RANGE_OPTS.find((o) => o.v === range)?.label}` })
                .catch(() => {
                  alert("Couldn't capture the charts as an image in this browser. Try again, or use Download / Print instead.");
                  return null;
                })
            }
            filename={`report-${range}-${todayStr()}.png`}
            shareTitle="My fitness report"
            shareText={message}
          />
        </div>
      </div>

      <div ref={chartsRef} className="ft-responsive-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
        <ReportChart title="Calories" data={buckets} dataKey="calAvg" target={goals.calories} unit=" kcal" colorFn={(d) => targetStatus3(d.calAvg, goals.calories, d.loggedDays).color} />
        <ReportChart title="Protein" data={buckets} dataKey="pAvg" target={goals.protein} unit="g" colorFn={(d) => targetStatus3(d.pAvg, goals.protein, d.loggedDays).color} />
        <ReportChart title="Carbs" data={buckets} dataKey="cAvg" target={goals.carb} unit="g" colorFn={(d) => targetStatus3(d.cAvg, goals.carb, d.loggedDays).color} />
        <ReportChart title="Fat" data={buckets} dataKey="fAvg" target={goals.fat} unit="g" colorFn={(d) => targetStatus3(d.fAvg, goals.fat, d.loggedDays).color} />
        <ReportChart
          title="Workouts"
          data={bucketsWithWorkoutTarget}
          dataKey="workoutSessions"
          targetKey="workoutTarget"
          target={goals.workoutsPerMonth}
          unit=""
          colorFn={(d) => targetStatus2(d.workoutSessions, goals.workoutsPerMonth * (d.days / 30), d.workoutSessions > 0).color}
        />
        <ReportChart title="Steps" data={buckets} dataKey="stepsAvg" target={goals.steps} unit="" colorFn={(d) => targetStatus2(d.stepsAvg, goals.steps, d.stepsLoggedDays > 0).color} />
      </div>
    </div>
  );
}

function ScheduleRow({ icon: Icon, title, subtitle, done, actionLabel, onAction, accent }) {
  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 14, padding: "12px 14px",
        borderBottom: "1px solid var(--line)",
      }}
    >
      <div
        style={{
          width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: done ? "var(--good)" : "var(--line)",
          color: done ? "#fff" : "var(--ink-soft)",
        }}
      >
        {done ? <CheckCircle2 size={16} /> : <Icon size={15} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{title}</div>
        <div className="ft-mono" style={{ fontSize: 12, color: "var(--ink-soft)" }}>{subtitle}</div>
      </div>
      <button
        className="ft-btn-outline ft-btn"
        style={{ fontSize: 12, padding: "6px 12px", flexShrink: 0, borderColor: accent }}
        onClick={onAction}
      >
        {actionLabel}
      </button>
    </div>
  );
}

function ScheduleStrip({ foodByDate, workoutByDate, stepsByDate, goals, milestones, onOpenFood, onOpenWorkout, onOpenSteps }) {
  const RANGE_BACK = 4, RANGE_FWD = 6;
  const dateList = Array.from({ length: RANGE_BACK + RANGE_FWD + 1 }, (_, i) => todayStr(i - RANGE_BACK));
  const [selected, setSelected] = useState(todayStr());
  const [viewMode, setViewMode] = useState("strip"); // strip | month
  const [calMonth, setCalMonth] = useState(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });

  const food = foodByDate[selected] || [];
  const workouts = workoutByDate[selected] || [];
  const stepsCount = (stepsByDate && stepsByDate[selected]) || 0;
  const totals = food.reduce((a, e) => ({ cal: a.cal + e.cal, p: a.p + e.p, c: a.c + e.c, f: a.f + e.f }), { cal: 0, p: 0, c: 0, f: 0 });
  const isFuture = selected > todayStr();
  const isToday = selected === todayStr();
  const dayLabel = isToday ? "Today" : new Date(selected + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });

  const naStr = isFuture ? "Not logged yet" : "Nothing logged";
  const trainingDates = goals.trainingDates || [];
  const isPlannedDay = (d) => trainingDates.includes(d);
  const selectedIsPlanned = isPlannedDay(selected);

  const year = calMonth.getFullYear();
  const month = calMonth.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calCells = [];
  for (let i = 0; i < firstWeekday; i++) calCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calCells.push(d);

  return (
    <div className="ft-card" style={{ padding: 0, overflow: "hidden", marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, padding: "10px 14px 0" }}>
        <button
          className="ft-btn-outline ft-btn"
          style={{ fontSize: 11, padding: "4px 10px", borderColor: viewMode === "strip" ? "var(--ink)" : "var(--line-strong)", borderWidth: viewMode === "strip" ? 2 : 1 }}
          onClick={() => setViewMode("strip")}
        >
          Day
        </button>
        <button
          className="ft-btn-outline ft-btn"
          style={{ fontSize: 11, padding: "4px 10px", borderColor: viewMode === "month" ? "var(--ink)" : "var(--line-strong)", borderWidth: viewMode === "month" ? 2 : 1 }}
          onClick={() => setViewMode("month")}
        >
          <Calendar size={12} /> Month
        </button>
      </div>

      {viewMode === "strip" ? (
        <div style={{ display: "flex", gap: 6, padding: "10px 14px 10px", overflowX: "auto" }}>
          {dateList.map((d) => {
            const dt = new Date(d + "T00:00:00");
            const active = d === selected;
            const today = d === todayStr();
            const planned = isPlannedDay(d);
            return (
              <button
                key={d}
                onClick={() => setSelected(d)}
                style={{
                  flexShrink: 0, width: 56, padding: "8px 0", borderRadius: 4, cursor: "pointer", position: "relative",
                  border: today ? "1px solid var(--ink)" : "1px solid var(--line)",
                  background: active ? "var(--ink)" : "var(--paper)",
                  color: active ? "var(--bg)" : "var(--ink)",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                }}
              >
                <span style={{ fontSize: 11, textTransform: "uppercase", opacity: .7 }}>
                  {dt.toLocaleDateString(undefined, { weekday: "short" })}
                </span>
                <span className="ft-mono ft-display" style={{ fontSize: 15, fontWeight: 600 }}>{dt.getDate()}</span>
                {planned && (
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: active ? "var(--bg)" : "var(--work)", position: "absolute", bottom: 4 }} />
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div style={{ padding: "10px 14px 14px", maxWidth: 360, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <button className="ft-btn-outline ft-btn" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => setCalMonth(new Date(year, month - 1, 1))}>‹</button>
            <span className="ft-display" style={{ fontSize: 13, fontWeight: 600 }}>
              {calMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </span>
            <button className="ft-btn-outline ft-btn" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => setCalMonth(new Date(year, month + 1, 1))}>›</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
            {DAY_NAMES.map((d) => (
              <div key={d} style={{ textAlign: "center", fontSize: 10, textTransform: "uppercase", color: "var(--ink-soft)" }}>{d[0]}</div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
            {calCells.map((d, i) => {
              if (d === null) return <div key={`b${i}`} />;
              const dateStr = ymd(year, month, d);
              const active = dateStr === selected;
              const today = dateStr === todayStr();
              const hasFood = (foodByDate[dateStr] || []).length > 0;
              const hasWorkout = (workoutByDate[dateStr] || []).length > 0;
              const planned = isPlannedDay(dateStr);
              const dayMilestones = (milestones || []).filter((m) => m.targetDate === dateStr && !m.completed);
              return (
                <button
                  key={dateStr}
                  onClick={() => setSelected(dateStr)}
                  title={dayMilestones.length > 0 ? dayMilestones.map((m) => m.title).join(", ") : undefined}
                  style={{
                    aspectRatio: "1", borderRadius: 4, cursor: "pointer", fontSize: 12, position: "relative",
                    border: today ? "1px solid var(--ink)" : "1px solid var(--line)",
                    background: active ? "var(--ink)" : "var(--paper)",
                    color: active ? "var(--bg)" : "var(--ink)",
                    fontWeight: today ? 700 : 400,
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1,
                  }}
                >
                  {d}
                  {dayMilestones.map((ms) => (
                    <span key={ms.id} style={{ fontSize: 7, fontWeight: 700, color: active ? "#FFB4A3" : "var(--warn)", lineHeight: 1.1, maxWidth: "92%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {ms.title}
                    </span>
                  ))}
                  <span style={{ position: "absolute", bottom: 3, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 2 }}>
                    {hasFood && <span style={{ width: 4, height: 4, borderRadius: "50%", background: active ? "var(--bg)" : "var(--cal)" }} />}
                    {hasWorkout && <span style={{ width: 4, height: 4, borderRadius: "50%", background: active ? "var(--bg)" : "var(--work)" }} />}
                    {planned && !hasWorkout && <span style={{ width: 4, height: 4, borderRadius: "50%", border: `1px solid ${active ? "var(--bg)" : "var(--work)"}` }} />}
                  </span>
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 14, fontSize: 11, color: "var(--ink-soft)", marginTop: 10, flexWrap: "wrap" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--cal)" }} /> Food logged</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--work)" }} /> Workout logged</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--warn)" }}>Red text = milestone due</span>
          </div>
        </div>
      )}

      {(milestones || []).filter((m) => !m.completed && daysUntil(m.targetDate) >= 0).length > 0 && (
        <div style={{ padding: "0 14px 14px", display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 10 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {milestones
              .filter((m) => !m.completed && daysUntil(m.targetDate) === 0)
              .map((m) => (
                <div
                  key={m.id}
                  style={{
                    position: "relative", background: "var(--good)", color: "#fff",
                    padding: "6px 14px", borderRadius: 999, fontSize: 11, fontWeight: 500,
                    marginTop: 8, whiteSpace: "nowrap",
                  }}
                >
                  <span
                    style={{
                      position: "absolute", top: -6, left: 18, width: 0, height: 0,
                      borderLeft: "6px solid transparent", borderRight: "6px solid transparent",
                      borderBottom: "6px solid var(--good)",
                    }}
                  />
                  {m.title} is due today
                </div>
              ))}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 10 }}>
            {milestones
              .filter((m) => !m.completed && daysUntil(m.targetDate) > 0)
              .sort((a, b) => a.targetDate.localeCompare(b.targetDate))
              .slice(0, 3)
              .map((m) => {
                const d = daysUntil(m.targetDate);
                return (
                  <div
                    key={m.id}
                    style={{
                      position: "relative", background: "var(--warn)", color: "#fff",
                      padding: "6px 14px", borderRadius: 999, fontSize: 11, fontWeight: 500,
                      marginTop: 8, whiteSpace: "nowrap",
                    }}
                  >
                    <span
                      style={{
                        position: "absolute", top: -6, right: 18, width: 0, height: 0,
                        borderLeft: "6px solid transparent", borderRight: "6px solid transparent",
                        borderBottom: "6px solid var(--warn)",
                      }}
                    />
                    {m.title} is {d} day{d === 1 ? "" : "s"} away
                  </div>
                );
              })}
          </div>
        </div>
      )}

      <div style={{ padding: "10px 14px", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)", background: "var(--bg)" }}>
        <span className="ft-display" style={{ fontSize: 14, fontWeight: 600 }}>{dayLabel}</span>
        {isFuture && <span style={{ fontSize: 11, color: "var(--ink-soft)", marginLeft: 8 }}>— coming up</span>}
        {selectedIsPlanned && <span style={{ fontSize: 11, color: "var(--work)", marginLeft: 8 }}>● planned training day</span>}
      </div>

      <div>
        <ScheduleRow
          icon={Flame}
          title="Calories"
          subtitle={totals.cal > 0 ? `${totals.cal} / ${goals.calories} kcal logged` : `${naStr} · target ${goals.calories} kcal`}
          done={totals.cal > 0}
          accent="var(--cal)"
          actionLabel={totals.cal > 0 ? "View" : "Log food"}
          onAction={() => onOpenFood(selected)}
        />
        <ScheduleRow
          icon={Activity}
          title="Steps"
          subtitle={stepsCount > 0 ? `${stepsCount} / ${goals.steps} steps logged` : `${naStr} · target ${goals.steps} steps`}
          done={stepsCount > 0}
          accent="var(--good)"
          actionLabel={stepsCount > 0 ? "View" : "Log steps"}
          onAction={() => onOpenSteps(selected)}
        />
        {workouts.length > 0 ? (
          workouts.map((w) => (
            <ScheduleRow
              key={w.id}
              icon={Dumbbell}
              title={w.type}
              subtitle={`${w.distanceKm ? w.distanceKm + " km · " : ""}${w.duration} min · ${w.calsBurned} kcal${w.effort != null ? ` · ${w.effort}% effort` : ""}`}
              done={true}
              accent="var(--work)"
              actionLabel="View"
              onAction={() => onOpenWorkout(selected)}
            />
          ))
        ) : (
          <ScheduleRow
            icon={Dumbbell}
            title="Training"
            subtitle={
              selectedIsPlanned
                ? (isFuture ? "Planned training day — coming up" : "Planned training day — not logged yet")
                : (isFuture ? "Nothing scheduled" : "Rest day · nothing logged")
            }
            done={false}
            accent={selectedIsPlanned && !isFuture ? "var(--warn)" : "var(--work)"}
            actionLabel="Log workout"
            onAction={() => onOpenWorkout(selected)}
          />
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Daily Report — single-day deep dive                                    */
/* ---------------------------------------------------------------------- */

/* ---------------------------------------------------------------------- */
/* Daily check-in — 8pm pop-up questionnaire + pass/fail report           */
/* ---------------------------------------------------------------------- */

function checkStatus(value, target, hasData = true, moreIsBetter = false) {
  if (!target) return { state: "none", label: "No target" };
  if (!hasData) return { state: "fail", label: "Not logged" };
  const pct = (value / target) * 100;
  if (moreIsBetter) {
    if (pct >= 100) return { state: "pass", label: "On target" };
    if (pct >= 90) return { state: "warn", label: "Slightly under" };
    return { state: "fail", label: "Under target" };
  }
  const diff = Math.abs(pct - 100);
  const over = pct > 100;
  if (diff <= 5) return { state: "pass", label: "On target" };
  if (diff <= 10) return { state: "warn", label: over ? "Slightly over" : "Slightly under" };
  return { state: "fail", label: over ? "Over target" : "Under target" };
}

function CheckRow({ label, state, detail }) {
  const icon = state === "pass" ? <CheckCircle2 size={18} color="var(--good)" />
    : state === "warn" ? <AlertTriangle size={18} color="var(--carb)" />
    : <XCircle size={18} color="var(--warn)" />;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
      {icon}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
        {detail && <div className="ft-mono" style={{ fontSize: 11, color: "var(--ink-soft)" }}>{detail}</div>}
      </div>
    </div>
  );
}

function DailyCheckInModal({ foodByDate, workoutByDate, stepsByDate, goals, onClose }) {
  const [step, setStep] = useState("questions"); // questions | report
  const [answers, setAnswers] = useState({ food: null, workout: null, steps: null });

  const date = todayStr();
  const food = foodByDate[date] || [];
  const workouts = workoutByDate[date] || [];
  const stepsCount = (stepsByDate && stepsByDate[date]) || 0;
  const totals = food.reduce((a, e) => ({ cal: a.cal + e.cal, p: a.p + e.p, c: a.c + e.c, f: a.f + e.f }), { cal: 0, p: 0, c: 0, f: 0 });

  const foodLogged = food.length > 0;
  const workoutLogged = workouts.length > 0;
  const stepsLogged = stepsCount > 0;
  const calStatus = checkStatus(totals.cal, goals.calories, foodLogged);
  const proteinStatus = checkStatus(totals.p, goals.protein, foodLogged);
  const carbStatus = checkStatus(totals.c, goals.carb, foodLogged);
  const fatStatus = checkStatus(totals.f, goals.fat, foodLogged);
  const stepsStatus = checkStatus(stepsCount, goals.steps, stepsLogged, true);

  const rows = [
    { label: "Food logged", state: foodLogged ? "pass" : "fail", detail: foodLogged ? `${food.length} item${food.length === 1 ? "" : "s"} logged` : "Nothing logged" },
    { label: "Workout logged", state: workoutLogged ? "pass" : "fail", detail: workoutLogged ? `${workouts.length} workout${workouts.length === 1 ? "" : "s"} logged` : "No workout logged" },
    { label: "Calories", state: calStatus.state, detail: `${totals.cal} / ${goals.calories} kcal — ${calStatus.label}` },
    { label: "Protein", state: proteinStatus.state, detail: `${Math.round(totals.p)} / ${goals.protein}g — ${proteinStatus.label}` },
    { label: "Carbs", state: carbStatus.state, detail: `${Math.round(totals.c)} / ${goals.carb}g — ${carbStatus.label}` },
    { label: "Fat", state: fatStatus.state, detail: `${Math.round(totals.f)} / ${goals.fat}g — ${fatStatus.label}` },
    { label: "Steps", state: stepsStatus.state, detail: `${stepsCount} / ${goals.steps} — ${stepsStatus.label}` },
  ];

  const passCount = rows.filter((r) => r.state === "pass").length;
  const failRows = rows.filter((r) => r.state === "fail").map((r) => r.label);
  const warnRows = rows.filter((r) => r.state === "warn").map((r) => r.label);

  let message;
  if (passCount === rows.length) {
    message = "Clean sheet today — everything logged and on target. Great work.";
  } else if (failRows.length === 0) {
    message = `Good day overall — just keep an eye on ${warnRows.join(", ")}, ${warnRows.length === 1 ? "it was" : "they were"} a little off target.`;
  } else if (passCount === 0) {
    message = "Rough day for logging and targets — tomorrow's a fresh start.";
  } else {
    message = `Doing well on ${rows.filter((r) => r.state === "pass").map((r) => r.label).join(", ")}. Needs attention: ${failRows.join(", ")}${warnRows.length ? `, and keep an eye on ${warnRows.join(", ")}` : ""}.`;
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(27,36,32,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div className="ft-card" style={{ maxWidth: 420, width: "100%", maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
          <h3 className="ft-display" style={{ margin: 0, fontSize: 17 }}>Evening check-in</h3>
          <button className="ft-btn-outline ft-btn" style={{ padding: 6 }} onClick={onClose} aria-label="Close"><X size={14} /></button>
        </div>
        <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 4 }}>{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>

        {step === "questions" ? (
          <div style={{ marginTop: 10 }}>
            <div style={{ marginBottom: 18 }}>
              <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>Did you log your food today?</p>
              <div style={{ display: "flex", gap: 8 }}>
                <button className={`ft-btn${answers.food === true ? "" : "-outline"} ft-btn`} style={{ flex: 1, justifyContent: "center" }} onClick={() => setAnswers({ ...answers, food: true })}>Yes</button>
                <button className={`ft-btn${answers.food === false ? "" : "-outline"} ft-btn`} style={{ flex: 1, justifyContent: "center" }} onClick={() => setAnswers({ ...answers, food: false })}>No</button>
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>Did you log your workout today?</p>
              <div style={{ display: "flex", gap: 8 }}>
                <button className={`ft-btn${answers.workout === true ? "" : "-outline"} ft-btn`} style={{ flex: 1, justifyContent: "center" }} onClick={() => setAnswers({ ...answers, workout: true })}>Yes</button>
                <button className={`ft-btn${answers.workout === false ? "" : "-outline"} ft-btn`} style={{ flex: 1, justifyContent: "center" }} onClick={() => setAnswers({ ...answers, workout: false })}>No</button>
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>Did you log your steps today?</p>
              <div style={{ display: "flex", gap: 8 }}>
                <button className={`ft-btn${answers.steps === true ? "" : "-outline"} ft-btn`} style={{ flex: 1, justifyContent: "center" }} onClick={() => setAnswers({ ...answers, steps: true })}>Yes</button>
                <button className={`ft-btn${answers.steps === false ? "" : "-outline"} ft-btn`} style={{ flex: 1, justifyContent: "center" }} onClick={() => setAnswers({ ...answers, steps: false })}>No</button>
              </div>
            </div>
            <button
              className="ft-btn"
              style={{ width: "100%", justifyContent: "center" }}
              disabled={answers.food === null || answers.workout === null || answers.steps === null}
              onClick={() => setStep("report")}
            >
              See my report <ChevronRight size={15} />
            </button>
          </div>
        ) : (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {rows.map((r) => <CheckRow key={r.label} label={r.label} state={r.state} detail={r.detail} />)}
            </div>
            <div className="ft-card" style={{ background: "var(--bg)", marginTop: 14, padding: 12 }}>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>{message}</p>
            </div>
            <button className="ft-btn" style={{ width: "100%", justifyContent: "center", marginTop: 14 }} onClick={onClose}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const DAILY_SCORE_MESSAGES = [
  "Nothing happened today. Hope you rested well — get it done tomorrow.",
  "We need to up the discipline a bit. Let's refocus and get it done tomorrow.",
  "We are getting better. Let's focus on a plan and get more done.",
  "You are doing well — make sure you push to get to the next level tomorrow.",
  "Well done logging and implementing your plan. Progress is on the horizon.",
  "Well done — this is where progress starts getting common. Keep it up!",
  "Yessssss, well done! Discipline is in place — keep it up!",
  "Amazing — you have reached every target for today!",
];

function dailyScoreMessage(metCount) {
  const text = DAILY_SCORE_MESSAGES[Math.max(0, Math.min(7, metCount))];
  const color = metCount <= 2 ? "var(--warn)" : metCount <= 4 ? "var(--carb)" : "var(--good)";
  return { text, color };
}

function monthlyScoreMessage(scorePct) {
  if (scorePct < 50) {
    return {
      text: "This month needs a reset. Pick one or two targets — steps and food logging are usually the easiest wins — and rebuild consistency there before adding more.",
      color: "var(--warn)",
    };
  }
  if (scorePct < 85) {
    return {
      text: "Solid progress, but there's room to tighten up. Look at which target slipped the most and set one small, specific goal for it next month.",
      color: "var(--carb)",
    };
  }
  return {
    text: "Excellent month — this is the kind of consistency that compounds. Keep the same routine going into next month.",
    color: "var(--good)",
  };
}

function computeDayReport(dateStr, foodByDate, workoutByDate, stepsByDate, goals) {
  const food = foodByDate[dateStr] || [];
  const workouts = workoutByDate[dateStr] || [];
  const steps = (stepsByDate && stepsByDate[dateStr]) || 0;
  const totals = food.reduce((a, e) => ({ cal: a.cal + e.cal, p: a.p + e.p, c: a.c + e.c, f: a.f + e.f }), { cal: 0, p: 0, c: 0, f: 0 });
  const foodLogged = food.length > 0;
  const workoutLogged = workouts.length > 0;

  function stat(value, target, hasData, moreIsBetter = false) {
    if (!target) return { label: "No target", color: "var(--ink-soft)", hit: false };
    if (!hasData) return { label: "Not logged", color: "var(--ink-soft)", hit: false };
    const pct = (value / target) * 100;
    if (moreIsBetter) {
      if (pct >= 100) return { label: "On target", color: "var(--good)", hit: true };
      if (pct >= 90) return { label: "Slightly under", color: "var(--carb)", hit: false };
      return { label: "Under target", color: "var(--warn)", hit: false };
    }
    const diff = Math.abs(pct - 100);
    const over = pct > 100;
    if (diff <= 5) return { label: "On target", color: "var(--good)", hit: true };
    if (diff <= 10) return { label: over ? "Slightly over" : "Slightly under", color: "var(--carb)", hit: false };
    return { label: over ? "Over target" : "Under target", color: "var(--warn)", hit: false };
  }

  const rows = [
    { key: "Calories", value: totals.cal, target: goals.calories, unit: " kcal", ...stat(totals.cal, goals.calories, foodLogged) },
    { key: "Protein", value: Math.round(totals.p), target: goals.protein, unit: "g", ...stat(totals.p, goals.protein, foodLogged) },
    { key: "Carbs", value: Math.round(totals.c), target: goals.carb, unit: "g", ...stat(totals.c, goals.carb, foodLogged) },
    { key: "Fat", value: Math.round(totals.f), target: goals.fat, unit: "g", ...stat(totals.f, goals.fat, foodLogged) },
    { key: "Steps", value: steps, target: goals.steps, unit: "", ...stat(steps, goals.steps, steps > 0, true) },
    { key: "Food logged", binary: true, hit: foodLogged, label: foodLogged ? "Logged" : "Not logged", color: foodLogged ? "var(--good)" : "var(--warn)" },
    { key: "Workout logged", binary: true, hit: workoutLogged, label: workoutLogged ? "Logged" : "Not logged", color: workoutLogged ? "var(--good)" : "var(--warn)" },
  ];
  const metCount = rows.filter((r) => r.hit).length;
  return { rows, metCount, totalTargets: rows.length, food, workouts, steps, totals, foodLogged, workoutLogged };
}

// resolve a CSS custom property like "var(--good)" to its actual hex value, for canvas drawing
function resolveColor(colorStr) {
  const map = {
    "var(--good)": "#00C853", "var(--warn)": "#FF1744", "var(--carb)": "#F5A300",
    "var(--ink-soft)": "#1E1E1C", "var(--ink)": "#141414", "var(--work)": "#0074FF",
    "var(--cal)": "#FF4500", "var(--protein)": "#00B88A", "var(--fat)": "#9B30FF",
  };
  return map[colorStr] || colorStr;
}

function drawReportCanvas({ title, subtitle, scoreText, scoreSub, scoreColor, rows }) {
  const canvas = document.createElement("canvas");
  const W = 800, H = 1000;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#D7DCD0"; ctx.lineWidth = 2; ctx.strokeRect(20, 20, W - 40, H - 40);

  ctx.textAlign = "center";
  ctx.fillStyle = "#5C6960"; ctx.font = "600 14px Inter, sans-serif";
  ctx.fillText("FIT DATA · REPORT CARD", W / 2, 70);
  ctx.fillStyle = "#1B2420"; ctx.font = "700 30px Georgia, serif";
  ctx.fillText(title, W / 2, 110);
  if (subtitle) {
    ctx.font = "400 15px Inter, sans-serif"; ctx.fillStyle = "#5C6960";
    ctx.fillText(subtitle, W / 2, 136);
  }
  ctx.strokeStyle = "#1B2420"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(60, 155); ctx.lineTo(W - 60, 155); ctx.stroke();

  ctx.fillStyle = resolveColor(scoreColor); ctx.font = "700 72px Georgia, serif";
  ctx.fillText(scoreText, W / 2, 250);
  ctx.fillStyle = "#5C6960"; ctx.font = "600 13px Inter, sans-serif";
  ctx.fillText(scoreSub.toUpperCase(), W / 2, 278);

  let y = 330;
  ctx.textAlign = "left";
  rows.forEach((r) => {
    ctx.strokeStyle = "#D7DCD0"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(60, y + 26); ctx.lineTo(W - 60, y + 26); ctx.stroke();
    ctx.fillStyle = "#1B2420"; ctx.font = "600 16px Inter, sans-serif";
    ctx.fillText(r.key, 60, y);
    if (!r.binary) {
      ctx.fillStyle = "#5C6960"; ctx.font = "400 13px 'IBM Plex Mono', monospace";
      ctx.fillText(`${r.value}${r.unit}${r.target ? ` / ${r.target}${r.unit}` : ""}`, 60, y + 19);
    }
    ctx.textAlign = "right"; ctx.fillStyle = resolveColor(r.color); ctx.font = "600 15px Inter, sans-serif";
    ctx.fillText((r.hit ? "✓ " : r.color === "var(--carb)" ? "△ " : "✕ ") + r.label, W - 60, y);
    ctx.textAlign = "left";
    y += 42;
  });

  ctx.fillStyle = "#5C6960"; ctx.font = "400 11px Inter, sans-serif"; ctx.textAlign = "center";
  ctx.fillText("Made with FIT DATA", W / 2, H - 30);

  return canvas;
}

async function shareOrDownloadCanvas(canvas, filename, shareTitle, shareText) {
  if (!canvas) return;
  canvas.toBlob(async (blob) => {
    if (!blob) return;
    const file = new File([blob], filename, { type: "image/png" });
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: shareTitle, text: shareText });
        return;
      } catch (e) {
        // user cancelled or share failed — fall through to download
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, "image/png");
}

function downloadCanvas(canvas, filename) {
  if (!canvas) return;
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, "image/png");
}

// captures an on-screen element (e.g. a block of charts) as an actual screenshot,
// framed with a small FIT DATA header/footer, using the browser's own SVG
// foreignObject rendering — no external screenshot library needed
function captureElementCanvas(el, { title } = {}) {
  return new Promise((resolve, reject) => {
    if (!el) { reject(new Error("no element")); return; }
    const rect = el.getBoundingClientRect();
    const w = Math.ceil(rect.width);
    const h = Math.ceil(rect.height);
    const clone = el.cloneNode(true);
    clone.querySelectorAll(".no-print").forEach((n) => n.remove());

    const headerH = 70, footerH = 36, pad = 20;
    const outW = w + pad * 2;
    const outH = h + headerH + footerH;

    const html = new XMLSerializer().serializeToString(clone);
    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml" style="background:#FFFFFF;font-family:Inter,Arial,sans-serif;color:#141414;width:${w}px;">${html}</div>
      </foreignObject>
    </svg>`;
    const svgUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgString);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = outW; canvas.height = outH;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, outW, outH);
      ctx.strokeStyle = "#DADAD5"; ctx.lineWidth = 2; ctx.strokeRect(4, 4, outW - 8, outH - 8);

      ctx.textAlign = "left";
      ctx.fillStyle = "#1E1E1C"; ctx.font = "600 13px Inter, sans-serif";
      ctx.fillText("FIT DATA", pad, 34);
      if (title) {
        ctx.fillStyle = "#141414"; ctx.font = "700 18px Georgia, serif";
        ctx.fillText(title, pad, 58);
      }
      ctx.strokeStyle = "#141414"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(pad, headerH - 4); ctx.lineTo(outW - pad, headerH - 4); ctx.stroke();

      ctx.drawImage(img, pad, headerH, w, h);

      ctx.textAlign = "center"; ctx.fillStyle = "#1E1E1C"; ctx.font = "400 11px Inter, sans-serif";
      ctx.fillText("Made with FIT DATA", outW / 2, outH - 14);

      resolve(canvas);
    };
    img.onerror = reject;
    img.src = svgUrl;
  });
}

// small icon-only Share + Download pair, for use inline next to existing controls
function ShareDownloadButtons({ onGetCanvas, filename, shareTitle, shareText }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      <button
        className="ft-btn-outline ft-btn"
        style={{ padding: 5 }}
        title="Share"
        onClick={async () => shareOrDownloadCanvas(await onGetCanvas(), filename, shareTitle, shareText)}
      >
        <Share2 size={12} />
      </button>
      <button
        className="ft-btn-outline ft-btn"
        style={{ padding: 5 }}
        title="Download"
        onClick={async () => downloadCanvas(await onGetCanvas(), filename)}
      >
        <Download size={12} />
      </button>
    </div>
  );
}

function DailyReportScreen({ foodByDate, workoutByDate, stepsByDate, goals, milestones, onOpenFood, onOpenWorkout }) {
  const [mode, setMode] = useState("day"); // day | month
  const [date, setDate] = useState(todayStr());
  const [reportMonth, setReportMonth] = useState(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });

  const isToday = date === todayStr();
  const isFuture = date > todayStr();
  const dayLabel = new Date(date + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const dayReport = computeDayReport(date, foodByDate, workoutByDate, stepsByDate, goals);
  const { rows, metCount, totalTargets, workouts, food } = dayReport;
  const dayMilestones = (milestones || []).filter((m) => m.targetDate === date && !m.completed);
  const workoutMinutes = workouts.reduce((s, w) => s + w.duration, 0);
  const workoutCals = workouts.reduce((s, w) => s + w.calsBurned, 0);
  const workoutPoints = workouts.reduce((s, w) => s + (w.points || 0), 0);

  let summary;
  if (isFuture) {
    summary = "This day hasn't happened yet.";
  } else if (!dayReport.foodLogged && !dayReport.workoutLogged) {
    summary = "Nothing logged for this day.";
  } else if (metCount === totalTargets) {
    summary = `All ${totalTargets} targets hit on this day. Well done.`;
  } else if (metCount === 0) {
    summary = `None of the ${totalTargets} daily targets were hit — worth a look at what happened.`;
  } else {
    summary = `${metCount} of ${totalTargets} targets hit on this day.`;
  }

  const scorePct = Math.round((metCount / totalTargets) * 100);
  const scoreColor = scorePct >= 85 ? "var(--good)" : scorePct >= 50 ? "var(--carb)" : "var(--warn)";
  const dayMsg = dailyScoreMessage(metCount);

  // ---- monthly aggregation ----
  const year = reportMonth.getFullYear(), monthIdx = reportMonth.getMonth();
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const today = new Date(todayStr() + "T00:00:00");
  const isCurrentMonth = year === today.getFullYear() && monthIdx === today.getMonth();
  const elapsedDays = isCurrentMonth ? today.getDate() : (reportMonth > today ? 0 : daysInMonth);
  const monthLabel = reportMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const monthDayReports = Array.from({ length: elapsedDays }, (_, i) => {
    const d = ymd(year, monthIdx, i + 1);
    return computeDayReport(d, foodByDate, workoutByDate, stepsByDate, goals);
  });

  const CATS = ["Calories", "Protein", "Carbs", "Fat", "Steps", "Food logged", "Workout logged"];
  const monthRows = CATS.map((key) => {
    const hits = monthDayReports.filter((dr) => dr.rows.find((r) => r.key === key)?.hit).length;
    const pct = elapsedDays > 0 ? Math.round((hits / elapsedDays) * 100) : 0;
    const color = pct >= 80 ? "var(--good)" : pct >= 50 ? "var(--carb)" : "var(--warn)";
    return { key, hits, elapsedDays, pct, color, hit: pct >= 80, binary: true, label: `${hits}/${elapsedDays} days` };
  });
  const monthMetCount = monthRows.filter((r) => r.hit).length;
  const monthScorePct = elapsedDays > 0 ? Math.round(monthDayReports.reduce((s, dr) => s + dr.metCount, 0) / (elapsedDays * 7) * 100) : 0;
  const monthScoreColor = monthScorePct >= 85 ? "var(--good)" : monthScorePct >= 50 ? "var(--carb)" : "var(--warn)";
  const monthMsg = monthlyScoreMessage(monthScorePct);
  const totalWorkoutsInMonth = monthDayReports.filter((dr) => dr.workoutLogged).length;

  let monthSummary;
  if (elapsedDays === 0) {
    monthSummary = "This month hasn't started yet.";
  } else if (monthScorePct >= 85) {
    monthSummary = `Strong month — ${monthScorePct}% of all targets hit across ${elapsedDays} days.`;
  } else if (monthScorePct <= 30) {
    monthSummary = `Tough month for consistency — only ${monthScorePct}% of targets hit. Fresh start next month.`;
  } else {
    monthSummary = `${monthScorePct}% of all targets hit across ${elapsedDays} days this month. ${monthMetCount} of 7 categories are trending well.`;
  }

  const handleShareDay = () => {
    const canvas = drawReportCanvas({
      title: dayLabel, subtitle: isToday ? "Today" : undefined,
      scoreText: `${metCount}/${totalTargets}`, scoreSub: `Targets met · ${scorePct}%`, scoreColor,
      rows,
    });
    shareOrDownloadCanvas(canvas, `daily-report-${date}.png`, "My daily report", summary);
  };
  const handleShareMonth = () => {
    const canvas = drawReportCanvas({
      title: monthLabel, subtitle: `${elapsedDays} days`,
      scoreText: `${monthScorePct}%`, scoreSub: `Overall target rate`, scoreColor: monthScoreColor,
      rows: monthRows,
    });
    shareOrDownloadCanvas(canvas, `monthly-report-${year}-${pad2(monthIdx + 1)}.png`, "My monthly report", monthSummary);
  };

  return (
    <div>
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h2 className="ft-display" style={{ margin: 0, fontSize: 18 }}>{mode === "day" ? "Daily report" : "Monthly report"}</h2>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="ft-btn-outline ft-btn" style={{ fontSize: 11, padding: "4px 10px", borderColor: mode === "day" ? "var(--ink)" : "var(--line-strong)", borderWidth: mode === "day" ? 2 : 1 }} onClick={() => setMode("day")}>Day</button>
            <button className="ft-btn-outline ft-btn" style={{ fontSize: 11, padding: "4px 10px", borderColor: mode === "month" ? "var(--ink)" : "var(--line-strong)", borderWidth: mode === "month" ? 2 : 1 }} onClick={() => setMode("month")}>Month</button>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {mode === "day" ? (
            <>
              <input className="ft-input" style={{ width: 170 }} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              {!isToday && <button className="ft-btn-outline ft-btn" style={{ fontSize: 12 }} onClick={() => setDate(todayStr())}>Today</button>}
            </>
          ) : (
            <>
              <button className="ft-btn-outline ft-btn" style={{ padding: "6px 10px" }} onClick={() => setReportMonth(new Date(year, monthIdx - 1, 1))}>‹</button>
              <span className="ft-display" style={{ fontSize: 14, fontWeight: 600, minWidth: 130, textAlign: "center" }}>{monthLabel}</span>
              <button className="ft-btn-outline ft-btn" style={{ padding: "6px 10px" }} onClick={() => setReportMonth(new Date(year, monthIdx + 1, 1))}>›</button>
            </>
          )}
          <button className="ft-btn-outline ft-btn" style={{ fontSize: 12 }} onClick={mode === "day" ? handleShareDay : handleShareMonth}>
            <Share2 size={13} /> Share
          </button>
          <button className="ft-btn" style={{ fontSize: 12 }} onClick={() => window.print()}>Download / Print</button>
        </div>
      </div>

      {mode === "day" ? (
        <>
          <div className="ft-card print-area" style={{ maxWidth: 640, margin: "0 auto", padding: 32 }}>
            <div style={{ textAlign: "center", borderBottom: "2px solid var(--ink)", paddingBottom: 18, marginBottom: 20 }}>
              <p style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-soft)", margin: "0 0 4px" }}>FIT DATA · Daily Report Card</p>
              <h1 className="ft-display" style={{ fontSize: 22, margin: "0 0 4px" }}>{dayLabel}{isToday ? " (today)" : ""}</h1>
            </div>

            <div style={{ display: "flex", justifyContent: "center", marginBottom: 22 }}>
              <div style={{ textAlign: "center" }}>
                <div className="ft-mono ft-display" style={{ fontSize: 48, fontWeight: 700, color: scoreColor, lineHeight: 1 }}>
                  {metCount}<span style={{ fontSize: 24, color: "var(--ink-soft)" }}>/{totalTargets}</span>
                </div>
                <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: "4px 0 0", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Targets met · {scorePct}%
                </p>
              </div>
            </div>

            <p style={{ textAlign: "center", fontSize: 14, margin: "0 0 8px", color: "var(--ink-soft)" }}>{summary}</p>
            <p style={{ textAlign: "center", fontSize: 13, fontWeight: 500, margin: "0 0 22px", color: dayMsg.color }}>{dayMsg.text}</p>

            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 8 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "6px 4px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--ink-soft)", borderBottom: "1px solid var(--ink)" }}>Goal</th>
                  <th style={{ textAlign: "right", padding: "6px 4px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--ink-soft)", borderBottom: "1px solid var(--ink)" }}>Achieved</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const Icon = r.hit ? CheckCircle2 : r.color === "var(--carb)" ? AlertTriangle : XCircle;
                  return (
                    <tr key={r.key} style={{ borderBottom: "1px solid var(--line)" }}>
                      <td style={{ padding: "10px 4px" }}>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{r.key}</div>
                        {!r.binary && (
                          <div className="ft-mono" style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                            {r.value}{r.unit} {r.target ? `/ ${r.target}${r.unit}` : ""}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "10px 4px", textAlign: "right" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500, color: r.color }}>
                          {r.label} <Icon size={16} color={r.color} />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {workouts.length > 0 && (
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
                <h3 className="ft-display" style={{ fontSize: 14, margin: "0 0 8px" }}>Training detail</h3>
                <div className="ft-mono" style={{ fontSize: 13, marginBottom: 8 }}>
                  {workoutMinutes} min · {workoutCals} kcal
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {workouts.map((w) => (
                    <div key={w.id} style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                      <span style={{ color: "var(--ink)", fontWeight: 500 }}>{w.type}</span> — {w.distanceKm ? `${w.distanceKm} km · ` : ""}{w.duration} min · {w.calsBurned} kcal{w.effort != null && <> · <span style={{ color: "var(--work)" }}>{w.effort}% effort</span></>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {dayMilestones.length > 0 && (
              <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
                <div className="ft-label" style={{ marginBottom: 6 }}>Milestone goals due</div>
                {dayMilestones.map((m) => (
                  <div key={m.id} style={{ fontSize: 13, color: "var(--warn)", fontWeight: 500 }}>{m.title}</div>
                ))}
              </div>
            )}
          </div>

          <div className="no-print" style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 16 }}>
            <button className="ft-btn-outline ft-btn" style={{ fontSize: 12 }} onClick={() => onOpenFood(date)}>Open food log</button>
            <button className="ft-btn-outline ft-btn" style={{ fontSize: 12 }} onClick={() => onOpenWorkout(date)}>Open workout log</button>
          </div>
        </>
      ) : (
        <div className="ft-card print-area" style={{ maxWidth: 640, margin: "0 auto", padding: 32 }}>
          <div style={{ textAlign: "center", borderBottom: "2px solid var(--ink)", paddingBottom: 18, marginBottom: 20 }}>
            <p style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-soft)", margin: "0 0 4px" }}>FIT DATA · Monthly Report Card</p>
            <h1 className="ft-display" style={{ fontSize: 22, margin: "0 0 4px" }}>{monthLabel}</h1>
            <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: 0 }}>{elapsedDays} of {daysInMonth} days elapsed · {totalWorkoutsInMonth} workout days logged</p>
          </div>

          <div style={{ display: "flex", justifyContent: "center", marginBottom: 22 }}>
            <div style={{ textAlign: "center" }}>
              <div className="ft-mono ft-display" style={{ fontSize: 48, fontWeight: 700, color: monthScoreColor, lineHeight: 1 }}>
                {monthScorePct}%
              </div>
              <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: "4px 0 0", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Overall target rate
              </p>
            </div>
          </div>

          <p style={{ textAlign: "center", fontSize: 14, margin: "0 0 8px", color: "var(--ink-soft)" }}>{monthSummary}</p>
          <p style={{ textAlign: "center", fontSize: 13, fontWeight: 500, margin: "0 0 22px", color: monthMsg.color }}>{monthMsg.text}</p>

          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 8 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "6px 4px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--ink-soft)", borderBottom: "1px solid var(--ink)" }}>Goal</th>
                <th style={{ textAlign: "right", padding: "6px 4px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--ink-soft)", borderBottom: "1px solid var(--ink)" }}>Days on target</th>
              </tr>
            </thead>
            <tbody>
              {monthRows.map((r) => {
                const Icon = r.pct >= 80 ? CheckCircle2 : r.pct >= 50 ? AlertTriangle : XCircle;
                return (
                  <tr key={r.key} style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "10px 4px" }}>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{r.key}</div>
                    </td>
                    <td style={{ padding: "10px 4px", textAlign: "right" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500, color: r.color }}>
                        {r.label} ({r.pct}%) <Icon size={16} color={r.color} />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DashboardScreen({ goals, profile, foodByDate, workoutByDate, stepsByDate, streakDays, milestones, onOpenFood, onOpenWorkout, onOpenSteps }) {
  // fixed ~13-month lookback so the Report panel can serve daily through yearly views
  const LOOKBACK_DAYS = 400;
  const dateList = Array.from({ length: LOOKBACK_DAYS }, (_, i) => todayStr(-(LOOKBACK_DAYS - 1 - i)));

  const rawSeries = dateList.map((d) => {
    const food = foodByDate[d] || [];
    const workout = workoutByDate[d] || [];
    const cal = food.reduce((s, e) => s + e.cal, 0);
    const p = food.reduce((s, e) => s + e.p, 0);
    const c = food.reduce((s, e) => s + e.c, 0);
    const f = food.reduce((s, e) => s + e.f, 0);
    const mins = workout.reduce((s, e) => s + e.duration, 0);
    const burned = workout.reduce((s, e) => s + (e.calsBurned || 0), 0);
    const steps = (stepsByDate && stepsByDate[d]) || 0;
    return { date: d, cal, p, c, f, mins, burned, workoutCount: workout.length, steps, hasWorkout: workout.length > 0 };
  });

  const todayEntries = foodByDate[todayStr()] || [];
  const todayTotals = todayEntries.reduce((a, e) => ({ cal: a.cal + e.cal, p: a.p + e.p, c: a.c + e.c, f: a.f + e.f }), { cal: 0, p: 0, c: 0, f: 0 });

  function macroStatus(value, target, hasData = true, moreIsBetter = false) {
    if (!target) return { label: "No target", color: "var(--ink-soft)" };
    if (!hasData) return { label: "Not logged", color: "var(--ink-soft)" };
    const pct = (value / target) * 100;
    if (moreIsBetter) {
      if (pct >= 100) return { label: "Target met", color: "var(--good)", pct };
      if (pct >= 90) return { label: "Slightly under", color: "var(--carb)", pct };
      return { label: "Under target", color: "var(--warn)", pct };
    }
    const diff = Math.abs(pct - 100);
    const over = pct > 100;
    if (diff <= 5) return { label: "Target met", color: "var(--good)", pct };
    if (diff <= 10) return { label: over ? "Slightly over" : "Slightly under", color: "var(--carb)", pct };
    return { label: over ? "Over target" : "Under target", color: "var(--warn)", pct };
  }

  return (
    <div>
      <ScheduleStrip foodByDate={foodByDate} workoutByDate={workoutByDate} stepsByDate={stepsByDate} goals={goals} milestones={milestones} onOpenFood={onOpenFood} onOpenWorkout={onOpenWorkout} onOpenSteps={onOpenSteps} />

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
        <StreakStrip days={streakDays} />
      </div>

      <ReportPanel rawSeries={rawSeries} goals={goals} />

      <div className="ft-card" style={{ marginTop: 20 }}>
        <h3 className="ft-display" style={{ marginTop: 0, fontSize: 16 }}>Daily breakdown</h3>
        <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 0, marginBottom: 14 }}>
          Last 14 days, colored against your daily targets.
        </p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 640 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--line-strong)" }}>
                <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 11, textTransform: "uppercase", color: "var(--ink-soft)", fontWeight: 500 }}>Day</th>
                <th style={{ textAlign: "right", padding: "8px 10px", fontSize: 11, textTransform: "uppercase", color: "var(--ink-soft)", fontWeight: 500 }}>Calories</th>
                <th style={{ textAlign: "right", padding: "8px 10px", fontSize: 11, textTransform: "uppercase", color: "var(--ink-soft)", fontWeight: 500 }}>Protein</th>
                <th style={{ textAlign: "right", padding: "8px 10px", fontSize: 11, textTransform: "uppercase", color: "var(--ink-soft)", fontWeight: 500 }}>Carbs</th>
                <th style={{ textAlign: "right", padding: "8px 10px", fontSize: 11, textTransform: "uppercase", color: "var(--ink-soft)", fontWeight: 500 }}>Fat</th>
                <th style={{ textAlign: "right", padding: "8px 10px", fontSize: 11, textTransform: "uppercase", color: "var(--ink-soft)", fontWeight: 500 }}>Steps</th>
                <th style={{ textAlign: "right", padding: "8px 10px", fontSize: 11, textTransform: "uppercase", color: "var(--ink-soft)", fontWeight: 500 }}>Workout</th>
              </tr>
            </thead>
            <tbody>
              {rawSeries.slice(-14).slice().reverse().map((r) => {
                const foodLoggedThatDay = (foodByDate[r.date] || []).length > 0;
                const cs = macroStatus(r.cal, goals.calories, foodLoggedThatDay);
                const ps = macroStatus(r.p, goals.protein, foodLoggedThatDay);
                const ccs = macroStatus(r.c, goals.carb, foodLoggedThatDay);
                const fs = macroStatus(r.f, goals.fat, foodLoggedThatDay);
                const ss = macroStatus(r.steps, goals.steps, r.steps > 0, true);
                return (
                  <tr key={r.date} style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "8px 10px", fontWeight: 500 }}>
                      {fmtShort(r.date)}{r.date === todayStr() ? " · today" : ""}
                    </td>
                    <td className="ft-mono" style={{ padding: "8px 10px", textAlign: "right", color: cs.color }}>
                      {foodLoggedThatDay ? `${r.cal} kcal` : "—"}
                    </td>
                    <td className="ft-mono" style={{ padding: "8px 10px", textAlign: "right", color: ps.color }}>
                      {foodLoggedThatDay ? `${Math.round(r.p)}g` : "—"}
                    </td>
                    <td className="ft-mono" style={{ padding: "8px 10px", textAlign: "right", color: ccs.color }}>
                      {foodLoggedThatDay ? `${Math.round(r.c)}g` : "—"}
                    </td>
                    <td className="ft-mono" style={{ padding: "8px 10px", textAlign: "right", color: fs.color }}>
                      {foodLoggedThatDay ? `${Math.round(r.f)}g` : "—"}
                    </td>
                    <td className="ft-mono" style={{ padding: "8px 10px", textAlign: "right", color: ss.color }}>
                      {r.steps > 0 ? `${r.steps}` : "—"}
                    </td>
                    <td className="ft-mono" style={{ padding: "8px 10px", textAlign: "right", color: r.mins > 0 ? "var(--work)" : "var(--ink-soft)" }}>
                      {r.mins > 0 ? `${r.mins}min · ${r.burned}kcal` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: 12, marginTop: 12, color: "var(--ink-soft)", flexWrap: "wrap" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--good)" }} /> Within 5% of target</span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--carb)" }} /> 5–10% over/under</span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--warn)" }} /> 10%+ over/under</span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--work)" }} /> Workout logged</span>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Main App                                                               */
/* ---------------------------------------------------------------------- */

const TABS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "dashboard", label: "Dashboard", icon: TrendingUp },
  { id: "dailyreport", label: "Daily Report", icon: Calendar },
  { id: "food", label: "Log food", icon: Flame },
  { id: "workout", label: "Log workout", icon: Dumbbell },
  { id: "steps", label: "Log steps", icon: Activity },
  { id: "goals", label: "Goals", icon: Target },
  { id: "test", label: "Fitness test", icon: Trophy },
];

export default function App() {
  // public policy pages — accessible without signing in, no hooks run for these
  const path = window.location.pathname;
  if (path === "/terms") return <TermsOfServicePage />;
  if (path === "/privacy") return <PrivacyPolicyPage />;
  if (path === "/cancellation-policy") return <CancellationPolicyPage />;
  if (path === "/refund-policy") return <RefundPolicyPage />;

  return <AppInner />;
}

function AppInner() {
  useGoogleFonts();

  const [session, setSession] = useState(undefined); // undefined = checking, null = signed out
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [profile, setProfileState] = useState(null);
  const [subscribed, setSubscribed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [goals, setGoalsState] = useState({ calories: 2200, protein: 150, carb: 220, fat: 70, targetWeightKg: 75, workoutsPerWeek: 4, workoutsPerMonth: 0, steps: 8000, trainingDates: [] });
  const [tab, setTab] = useState("dashboard");
  const [foodDate, setFoodDate] = useState(todayStr());
  const [workoutDate, setWorkoutDate] = useState(todayStr());
  const [stepsDate, setStepsDate] = useState(todayStr());
  const [foodByDate, setFoodByDate] = useState({});
  const [workoutByDate, setWorkoutByDate] = useState({});
  const [stepsByDate, setStepsByDate] = useState({});
  const [testExercises, setTestExercises] = useState([]);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [checkInShownDate, setCheckInShownDate] = useState(null);
  const [testResults, setTestResults] = useState({});
  const [inbodyScans, setInbodyScans] = useState([]);
  const [measurements, setMeasurements] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [customFoods, setCustomFoods] = useState([]);

  // track the Supabase auth session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "PASSWORD_RECOVERY") setPasswordRecovery(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // surface storage read/write failures that storeGet/storeSet would otherwise swallow
  useEffect(() => {
    const handler = (e) => setSaveError(e.detail);
    window.addEventListener("ft-store-error", handler);
    return () => window.removeEventListener("ft-store-error", handler);
  }, []);

  useEffect(() => {
    if (!saveError) return;
    const t = setTimeout(() => setSaveError(null), 6000);
    return () => clearTimeout(t);
  }, [saveError]);

  const resetLocalState = () => {
    setProfileState(null);
    setSubscribed(false);
    setTermsAccepted(false);
    setGoalsState({ calories: 2200, protein: 150, carb: 220, fat: 70, targetWeightKg: 75, workoutsPerWeek: 4, workoutsPerMonth: 0, steps: 8000, trainingDates: [] });
    setFoodByDate({});
    setWorkoutByDate({});
    setStepsByDate({});
    setTestExercises([]);
    setTestResults({});
    setInbodyScans([]);
    setMeasurements([]);
    setMilestones([]);
    setCustomFoods([]);
    setCheckInShownDate(null);
  };

  // load this user's data once we know who's signed in
  useEffect(() => {
    if (session === undefined) return; // still checking for an existing session
    if (!session) {
      resetLocalState();
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      let p = await storeGet("profile", null);
      if (!p) {
        const meta = session.user.user_metadata || {};
        p = { name: meta.name || session.user.email.split("@")[0], email: session.user.email, startWeightKg: undefined };
        await storeSet("profile", p);
      }
      const { data: subRow } = await supabase
        .from("subscriptions")
        .select("status")
        .eq("user_id", session.user.id)
        .maybeSingle();
      const tv = await storeGet("terms-version", null);
      const g = await storeGet("goals", null);
      const te = await storeGet("test-exercises", []);
      const tr = await storeGet("test-results", {});
      const ib = await storeGet("inbody-scans", []);
      const meas = await storeGet("measurements", []);
      const ms = await storeGet("milestone-goals", []);
      const cf = await storeGet("custom-foods", []);
      const cid = await storeGet("checkin-shown-date", null);
      if (cid) setCheckInShownDate(cid);
      setProfileState(p);
      if (subRow?.status === "active") setSubscribed(true);
      if (tv === TERMS_VERSION) setTermsAccepted(true);
      if (g) setGoalsState(g);
      if (te) setTestExercises(te);
      if (tr) setTestResults(tr);
      if (ib) setInbodyScans(ib);
      if (meas) setMeasurements(meas);
      if (ms) setMilestones(ms);
      if (cf) setCustomFoods(cf);

      // all food/workout logs live under two consolidated keys (one request each)
      const fMap = await storeGet("foodlogs", {});
      const wMap = await storeGet("workoutlogs", {});
      const sMap = await storeGet("steps", {});
      setFoodByDate(fMap || {});
      setWorkoutByDate(wMap || {});
      setStepsByDate(sMap || {});
      setLoading(false);
    })();
  }, [session]);

  // check every minute — if it's 8pm or later local time and today's check-in hasn't shown yet, pop it up.
  // (only fires while the app is open; a browser tab can't wake itself up at an exact time when closed)
  useEffect(() => {
    const check = () => {
      const now = new Date();
      const today = todayStr();
      if (now.getHours() >= 20 && checkInShownDate !== today && !loading && profile && subscribed) {
        setShowCheckIn(true);
        setCheckInShownDate(today);
        storeSet("checkin-shown-date", today);
      }
    };
    check();
    const id = setInterval(check, 60000);
    return () => clearInterval(id);
  }, [checkInShownDate, loading, profile, subscribed]);

  const setProfile = useCallback((p) => {
    const next = { ...p, startWeightKg: profile?.startWeightKg || p.weightKg };
    setProfileState(next);
    storeSet("profile", next);
  }, [profile]);

  const setGoals = useCallback((g) => {
    setGoalsState(g);
    storeSet("goals", g);
  }, []);

  const handleSubscribe = async (plan) => {
    const { data, error } = await supabase.functions.invoke("create-paystack-payment", { body: { plan } });
    if (error || !data?.authorization_url) {
      throw new Error(data?.error || error?.message || "Couldn't start checkout. Please try again.");
    }
    window.location.href = data.authorization_url;
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm("Cancel your subscription? You'll lose access to logging and tracking immediately.")) return;
    const { data, error } = await supabase.functions.invoke("cancel-paystack-subscription");
    if (error || !data?.ok) {
      window.alert(data?.error || error?.message || "Couldn't cancel right now. Please try again.");
      return;
    }
    setSubscribed(false);
  };

  const handleAcceptTerms = () => {
    setTermsAccepted(true);
    storeSet("terms-version", TERMS_VERSION);
    if (session) {
      supabase.from("terms_acceptance").insert({ user_id: session.user.id, version: TERMS_VERSION });
    }
  };

  const addFoodEntry = (date, entry) => {
    setFoodByDate((prev) => {
      const next = { ...prev, [date]: [...(prev[date] || []), entry] };
      storeSet("foodlogs", next);
      return next;
    });
  };
  const removeFoodEntry = (date, id) => {
    setFoodByDate((prev) => {
      const next = { ...prev, [date]: (prev[date] || []).filter((e) => e.id !== id) };
      storeSet("foodlogs", next);
      return next;
    });
  };
  const addWorkoutEntry = (date, entry) => {
    setWorkoutByDate((prev) => {
      const next = { ...prev, [date]: [...(prev[date] || []), entry] };
      storeSet("workoutlogs", next);
      return next;
    });
  };
  const removeWorkoutEntry = (date, id) => {
    setWorkoutByDate((prev) => {
      const next = { ...prev, [date]: (prev[date] || []).filter((e) => e.id !== id) };
      storeSet("workoutlogs", next);
      return next;
    });
  };
  const setDailySteps = (date, value) => {
    setStepsByDate((prev) => {
      const next = { ...prev, [date]: Number(value) };
      storeSet("steps", next);
      return next;
    });
  };
  const addTestExercise = (ex) => {
    setTestExercises((prev) => {
      const next = [...prev, ex];
      storeSet("test-exercises", next);
      return next;
    });
  };
  const removeTestExercise = (id) => {
    setTestExercises((prev) => {
      const next = prev.filter((e) => e.id !== id);
      storeSet("test-exercises", next);
      return next;
    });
    setTestResults((prev) => {
      const next = { ...prev };
      delete next[id];
      storeSet("test-results", next);
      return next;
    });
  };
  const addTestResult = (exerciseId, result) => {
    setTestResults((prev) => {
      const next = { ...prev, [exerciseId]: [...(prev[exerciseId] || []), result] };
      storeSet("test-results", next);
      return next;
    });
  };
  const addInbodyScan = (scan) => {
    setInbodyScans((prev) => {
      const next = [...prev, scan];
      storeSet("inbody-scans", next);
      return next;
    });
  };
  const removeInbodyScan = (id) => {
    setInbodyScans((prev) => {
      const next = prev.filter((s) => s.id !== id);
      storeSet("inbody-scans", next);
      return next;
    });
  };

  const addMeasurement = (m) => {
    setMeasurements((prev) => {
      const next = [...prev, m];
      storeSet("measurements", next);
      return next;
    });
  };
  const removeMeasurement = (id) => {
    setMeasurements((prev) => {
      const next = prev.filter((m) => m.id !== id);
      storeSet("measurements", next);
      return next;
    });
  };

  const addCustomFood = (food) => {
    setCustomFoods((prev) => {
      const next = [...prev, food];
      storeSet("custom-foods", next);
      return next;
    });
  };

  const addMilestone = (m) => {
    setMilestones((prev) => {
      const next = [...prev, m];
      storeSet("milestone-goals", next);
      return next;
    });
  };
  const toggleMilestone = (id) => {
    setMilestones((prev) => {
      const next = prev.map((m) => (m.id === id ? { ...m, completed: !m.completed } : m));
      storeSet("milestone-goals", next);
      return next;
    });
  };
  const removeMilestone = (id) => {
    setMilestones((prev) => {
      const next = prev.filter((m) => m.id !== id);
      storeSet("milestone-goals", next);
      return next;
    });
  };

  const logout = () => {
    supabase.auth.signOut();
    resetLocalState();
  };

  const streakDays = Array.from({ length: 14 }, (_, i) => {
    const d = todayStr(-(13 - i));
    return { date: d, logged: !!(foodByDate[d]?.length) };
  });

  if (passwordRecovery) {
    return (
      <div className="ft-root">
        <style>{TOKENS}</style>
        <ResetPasswordScreen onDone={() => setPasswordRecovery(false)} />
      </div>
    );
  }

  if (session === undefined || loading) {
    return (
      <div className="ft-root" style={{ padding: 40, textAlign: "center", color: "var(--ink-soft)" }}>
        <style>{TOKENS}</style>
        Loading…
      </div>
    );
  }

  if (!session || !profile) {
    return (
      <div className="ft-root">
        <style>{TOKENS}</style>
        <AuthScreen />
      </div>
    );
  }

  if (!termsAccepted) {
    return (
      <div className="ft-root">
        <style>{TOKENS}</style>
        <TermsScreen onAccept={handleAcceptTerms} onDecline={logout} />
      </div>
    );
  }

  if (!subscribed) {
    return (
      <div className="ft-root">
        <style>{TOKENS}</style>
        <PaywallScreen onSubscribe={handleSubscribe} onBack={logout} />
      </div>
    );
  }

  return (
    <div className="ft-root">
      <style>{TOKENS}</style>
      {saveError && (
        <div
          className="no-print"
          style={{
            position: "fixed", top: 0, left: 0, right: 0, zIndex: 90,
            background: "var(--warn)", color: "#fff", padding: "10px 16px",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            fontSize: 13, fontFamily: "Inter, sans-serif",
          }}
        >
          <AlertTriangle size={15} />
          <span>
            {saveError.action === "save"
              ? "Couldn't save your last change — check your connection and try again."
              : "Couldn't load your data — check your connection and try again."}
          </span>
          <button
            onClick={() => setSaveError(null)}
            aria-label="Dismiss"
            style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", display: "flex", marginLeft: 4 }}
          >
            <X size={15} />
          </button>
        </div>
      )}
      <div style={{ display: "flex", minHeight: 700 }}>
        <button className="ft-hamburger no-print" onClick={() => setMobileNavOpen(true)} aria-label="Open menu">
          <Menu size={20} />
        </button>
        <div className={`ft-overlay no-print ${mobileNavOpen ? "open" : ""}`} onClick={() => setMobileNavOpen(false)} />
        <div className={`no-print ft-sidebar ${mobileNavOpen ? "open" : ""}`} style={{ width: 200, background: "var(--ink)", padding: "20px 14px", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <button className="ft-sidebar-close" onClick={() => setMobileNavOpen(false)} aria-label="Close menu">
            <X size={16} />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--bg)", opacity: .85, fontSize: 13, marginBottom: 16, paddingLeft: 8 }}>
            <User size={14} /> {profile.name}
          </div>
          <div style={{ marginBottom: 24, paddingLeft: 8 }}>
            <span style={{ fontSize: 17, fontWeight: 700, fontFamily: "Georgia, serif", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--bg)" }}>FIT DATA</span>
            <div style={{ width: 32, height: 2, background: "var(--bg)", opacity: 0.5, marginTop: 6 }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
            {TABS.map((t) => (
              <button key={t.id} className={`ft-tab ${tab === t.id ? "active" : ""}`} onClick={() => { setTab(t.id); setMobileNavOpen(false); }}>
                <t.icon size={16} /> {t.label}
              </button>
            ))}
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,.15)", paddingTop: 14, marginTop: 14 }}>
            <button className="ft-tab" onClick={() => { setShowCheckIn(true); setMobileNavOpen(false); }}>
              <Calendar size={16} /> Evening check-in
            </button>
            <button className="ft-tab" onClick={handleCancelSubscription} style={{ marginTop: 10 }}>
              <XCircle size={16} /> Cancel subscription
            </button>
            <button className="ft-tab" onClick={logout} style={{ marginTop: 10 }}>
              <LogOut size={16} /> Sign out
            </button>
          </div>
        </div>

        <div className="ft-main" style={{ flex: 1, padding: 28, overflow: "auto" }}>
          {tab === "profile" && (
            <ProfileScreen
              profile={profile} setProfile={setProfile}
              goals={goals} setGoals={setGoals}
              inbodyScans={inbodyScans} addInbodyScan={addInbodyScan} removeInbodyScan={removeInbodyScan}
              measurements={measurements} addMeasurement={addMeasurement} removeMeasurement={removeMeasurement}
            />
          )}
          {tab === "dashboard" && (
            <DashboardScreen
              goals={goals} profile={profile} foodByDate={foodByDate} workoutByDate={workoutByDate} stepsByDate={stepsByDate} streakDays={streakDays}
              milestones={milestones}
              onOpenFood={(d) => { setFoodDate(d); setTab("food"); }}
              onOpenWorkout={(d) => { setWorkoutDate(d); setTab("workout"); }}
              onOpenSteps={(d) => { setStepsDate(d); setTab("steps"); }}
            />
          )}
          {tab === "dailyreport" && (
            <DailyReportScreen
              foodByDate={foodByDate} workoutByDate={workoutByDate} stepsByDate={stepsByDate} goals={goals} milestones={milestones}
              onOpenFood={(d) => { setFoodDate(d); setTab("food"); }}
              onOpenWorkout={(d) => { setWorkoutDate(d); setTab("workout"); }}
            />
          )}
          {tab === "food" && (
            <FoodLogScreen
              date={foodDate} setDate={setFoodDate}
              entries={foodByDate[foodDate] || []}
              addEntry={(e) => addFoodEntry(foodDate, e)}
              removeEntry={(id) => removeFoodEntry(foodDate, id)}
              goals={goals}
              customFoods={customFoods}
              addCustomFood={addCustomFood}
            />
          )}
          {tab === "workout" && (
            <WorkoutLogScreen
              date={workoutDate} setDate={setWorkoutDate}
              entries={workoutByDate[workoutDate] || []}
              addEntry={(e) => addWorkoutEntry(workoutDate, e)}
              removeEntry={(id) => removeWorkoutEntry(workoutDate, id)}
              weightKg={profile.weightKg}
            />
          )}
          {tab === "steps" && (
            <LogStepsScreen
              date={stepsDate} setDate={setStepsDate}
              stepsByDate={stepsByDate}
              setSteps={(v) => setDailySteps(stepsDate, v)}
              stepsGoal={goals.steps}
            />
          )}
          {tab === "goals" && (
            <GoalsScreen
              goals={goals} setGoals={setGoals} profile={profile}
              milestones={milestones} addMilestone={addMilestone} toggleMilestone={toggleMilestone} removeMilestone={removeMilestone}
            />
          )}
          {tab === "test" && (
            <FitnessTestScreen
              exercises={testExercises}
              addExercise={addTestExercise}
              removeExercise={removeTestExercise}
              results={testResults}
              addResult={addTestResult}
            />
          )}
        </div>
      </div>

      {showCheckIn && (
        <DailyCheckInModal
          foodByDate={foodByDate}
          workoutByDate={workoutByDate}
          stepsByDate={stepsByDate}
          goals={goals}
          onClose={() => setShowCheckIn(false)}
        />
      )}
    </div>
  );
}
