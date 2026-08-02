"use client";

import { Accordion } from "@heroui/react";
import { ChevronDown } from "lucide-react";

type Faq = { id: string; question: string; answer: string };

export function StorefrontFaqAccordion({ faqs }: { faqs: Faq[] }) {
  return <Accordion dir="rtl" variant="surface" hideSeparator className="grid gap-2 bg-transparent p-0 text-right" aria-label="سوالات متداول فروشگاه">
    {faqs.map((faq) => <Accordion.Item key={faq.id} id={faq.id} className="overflow-hidden rounded-[5px] border border-[#e9e9e9] bg-white px-5"><Accordion.Heading><Accordion.Trigger className="flex w-full items-center justify-between gap-4 py-5 text-right text-sm font-bold text-[#303030]"><span>{faq.question}</span><Accordion.Indicator className="shrink-0 text-[#888]"><ChevronDown size={16} /></Accordion.Indicator></Accordion.Trigger></Accordion.Heading><Accordion.Panel><Accordion.Body className="border-t border-[#f0f0f0] py-5 text-right text-sm leading-8 text-[#707070]">{faq.answer}</Accordion.Body></Accordion.Panel></Accordion.Item>)}
  </Accordion>;
}
