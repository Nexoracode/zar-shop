"use client";

import { Accordion } from "@heroui/react";
import { ChevronDown } from "lucide-react";

type Faq = { id: string; question: string; answer: string };

export function StorefrontFaqAccordion({ faqs }: { faqs: Faq[] }) {
  return <Accordion dir="rtl" variant="surface" hideSeparator className="grid w-full gap-2 bg-transparent p-0 text-right" aria-label="سوالات متداول فروشگاه">
    {faqs.map((faq) => <Accordion.Item key={faq.id} id={faq.id} className="w-full overflow-hidden rounded-[5px] border border-[#eeeeee] bg-white px-5 transition-colors duration-150 hover:bg-[#fafafa]"><Accordion.Heading><Accordion.Trigger className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-6 py-5 text-right text-sm font-bold text-[#303030]"><span className="min-w-0 text-right">{faq.question}</span><Accordion.Indicator className="shrink-0 text-[#888]"><ChevronDown size={16} /></Accordion.Indicator></Accordion.Trigger></Accordion.Heading><Accordion.Panel><Accordion.Body className="border-t border-[#f0f0f0] py-5 text-right text-sm leading-8 text-[#707070]">{faq.answer}</Accordion.Body></Accordion.Panel></Accordion.Item>)}
  </Accordion>;
}
