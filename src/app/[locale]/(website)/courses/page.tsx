import React from 'react';
import type { Metadata } from "next";
import { courses } from '@/lib/data/courses';
import BackNavbar from '@/components/BackNavbar';
import {
  Award,
  BookOpen,
  Zap,
  Users,
  Check,
  GraduationCap,
  LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import LeadForm from "@/components/LeadForm";

export const metadata: Metadata = {
  title: "Academy",
  description:
    "Free and certified courses on business automation, finance and operations, taught for the people running the business.",
};

const BENEFITS = [
  { icon: Award, title: "Certified", desc: "Credentials that show you can run a modern business platform." },
  { icon: BookOpen, title: "Practical", desc: "Taught by the team who built BBU1, around real workflows." },
  { icon: Zap, title: "Hands on", desc: "You work through real scenarios, not slides and quizzes." },
  { icon: Users, title: "Community", desc: "A group of other owners and operators taking the same courses." },
];

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ course?: string }>;
};

export async function generateStaticParams() {
  return [{ locale: 'en' }];
}

export default async function CoursesPage({ searchParams }: PageProps) {
  const { course: courseId } = await searchParams;

  const freeTracks = courses.filter((c: any) => c.category === "Free");
  const certTracks = courses.filter((c: any) => c.category === "Certification");
  const selectedCourse = courses.find((c: any) => String(c.id) === courseId);

  return (
    <div className="flex min-h-screen flex-col bg-white font-sans text-slate-900 selection:bg-blue-500/20">
      <BackNavbar backHref="/" backLabel="Home" />

      <main className="flex-grow pb-24 pt-20">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6">

          <header className="max-w-3xl pt-8">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
              <GraduationCap className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-xs font-medium text-slate-600">Academy</span>
            </div>

            <h1 className="text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
              Learn to run your business better
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600 md:text-lg">
              Free and certified courses on automation, finance and operations, built for people
              running a business rather than writing code.
            </p>
          </header>

          <section className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((ben, i) => {
              const Icon = ben.icon;
              return (
                <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    {Icon ? <Icon className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
                  </div>
                  <h2 className="text-base font-semibold tracking-tight text-slate-900">{ben.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{ben.desc}</p>
                </div>
              );
            })}
          </section>

          <section className="mt-20 md:mt-24">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">
                Free courses
              </h2>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                No cost
              </span>
            </div>

            {freeTracks.length === 0 ? (
              <p className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
                Free courses are being prepared.
              </p>
            ) : (
              <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
                {freeTracks.map((course: any) => {
                  const Icon = course.icon;
                  const topics: string[] = Array.isArray(course.topics) ? course.topics : [];

                  return (
                    <div
                      key={course.id}
                      className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"
                    >
                      <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                        {Icon ? <Icon className="h-5 w-5" /> : <LayoutGrid className="h-5 w-5" />}
                      </div>

                      <h3 className="text-lg font-semibold leading-tight tracking-tight text-slate-900 md:text-xl">
                        {course.title}
                      </h3>

                      <p className="mt-3 text-sm leading-relaxed text-slate-600">
                        {course.description}
                      </p>

                      {topics.length > 0 ? (
                        <div className="mt-5 flex flex-1 flex-wrap gap-x-4 gap-y-2">
                          {topics.map((t, idx) => (
                            <span key={idx} className="flex items-center gap-1.5 text-sm text-slate-500">
                              <Check className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                              {t}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="flex-1" />
                      )}

                      <Button
                        className="mt-7 h-11 w-full rounded-xl bg-slate-900 text-sm font-medium text-white hover:bg-slate-800 sm:w-auto sm:px-8"
                        asChild
                      >
                        <a href={`?course=${course.id}#enroll`}>Enroll</a>
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="mt-20 md:mt-24">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">
              Certification tracks
            </h2>

            {certTracks.length === 0 ? (
              <p className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
                Certification tracks are being prepared.
              </p>
            ) : (
              <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {certTracks.map((course: any) => {
                  const Icon = course.icon;
                  const topics: string[] = Array.isArray(course.topics) ? course.topics : [];

                  return (
                    <div
                      key={course.id}
                      className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                          {Icon ? <Icon className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
                        </div>
                        {course.price ? (
                          <span className="text-base font-semibold tracking-tight text-slate-900">
                            {course.price}
                          </span>
                        ) : null}
                      </div>

                      <h3 className="mt-5 text-base font-semibold leading-tight tracking-tight text-slate-900">
                        {course.title}
                      </h3>

                      <p className="mt-2 text-sm leading-relaxed text-slate-600">
                        {course.description}
                      </p>

                      <div className="mt-5 flex-1 space-y-2">
                        {topics.slice(0, 3).map((t, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm text-slate-500">
                            <Check className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            {t}
                          </div>
                        ))}
                      </div>

                      <Button
                        variant="outline"
                        className="mt-7 h-11 w-full rounded-xl border-slate-200 text-sm font-medium text-slate-900 hover:bg-slate-50"
                        asChild
                      >
                        <a href={`?course=${course.id}#enroll`}>Apply</a>
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section
            id="enroll"
            className="mx-auto mt-20 max-w-3xl scroll-mt-24 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-12 sm:px-10 sm:py-16 md:mt-28"
          >
            <div className="text-center">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
                Save your spot
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-600">
                Tell us a little about yourself and we will confirm your access.
              </p>

              {selectedCourse ? (
                <div className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2">
                  <Check className="h-3.5 w-3.5 text-slate-500" />
                  <span className="text-sm text-slate-700">{selectedCourse.title}</span>
                </div>
              ) : null}
            </div>

            <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
              <LeadForm
                intent={selectedCourse ? `ACADEMY_ENROLL_${selectedCourse.id}` : "ACADEMY_ENROLL"}
                ctaText="Submit application"
              />
            </div>
          </section>

          <section className="mt-20 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-12 text-center sm:px-12 sm:py-16 md:mt-28">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
              Start learning
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-600">
              Pick up practical skills for running a modern business.
            </p>
            <Button
              className="mt-8 h-12 rounded-xl bg-slate-900 px-8 text-sm font-medium text-white hover:bg-slate-800"
              asChild
            >
              <a href="#enroll">Enroll now</a>
            </Button>
          </section>

        </div>
      </main>
    </div>
  );
}