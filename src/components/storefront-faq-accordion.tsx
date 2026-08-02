"use client";

import { Accordion } from "@heroui/react";
import { ChevronDown } from "lucide-react";

type Faq = { id: string; question: string; answer: string };

export function StorefrontFaqAccordion({ faqs }: { faqs: Faq[] }) {
  return <Accordion dir="rtl" variant="surface" hideSeparator className="grid gap-3 bg-transparent p-0 text-right" aria-label="سوالات متداول فروشگاه">
    {faqs.map((faq, index) => <Accordion.Item key={faq.id} id={faq.id} className="overflow-hidden rounded-[6px] border border-[#e3e3e3] bg-white px-4 shadow-[0_4px_18px_rgba(0,0,0,0.025)] sm:px-5"><Accordion.Heading><Accordion.Trigger className="flex w-full items-center justify-between gap-4 py-5 text-right text-sm font-bold text-[#252525]"><span className="flex min-w-0 items-center gap-3"><small className="grid size-7 shrink-0 place-items-center rounded-[4px] bg-[#f1f1f1] text-[10px] font-black text-[#777]">{(index + 1).toLocaleString("fa-IR")}</small><span>{faq.question}</span></span><Accordion.Indicator className="grid size-8 shrink-0 place-items-center rounded-[4px] bg-[#f3f3f3] text-[#666]"><ChevronDown size={16} /></Accordion.Indicator></Accordion.Trigger></Accordion.Heading><Accordion.Panel><Accordion.Body className="border-t border-[#eeeeee] py-5 pr-10 text-right text-sm leading-8 text-[#686868]">{faq.answer}</Accordion.Body></Accordion.Panel></Accordion.Item>)}
  </Accordion>;
}
