import { readFileSync } from "fs";

const token = process.env.GITHUB_TOKEN;
const repo = process.env.GITHUB_REPOSITORY;
const [owner, repoName] = repo.split("/");

const changes = readFileSync("changes.json", "utf8");

const body = [
"The weekly rank check found firms whose position in the public ranking source no longer matches `uk_rank` in Supabase.",
"",
"**Source:** https://lawyermag.co.uk/law-firm-rankings-leading-law-firms-in-uk/",
"",
"**This is a proposal, not an automatic change** — the source is a free secondary compilation (The Lawyer's own list is paywalled), so please sanity-check before updating anything.",
"",
"```json",
changes,
"```",
"",
"If these look right, update `uk_rank` for the affected firms in Supabase's Table Editor or SQL Editor."
].join("\n");

const res = await fetch(`https://api.github.com/repos/${owner}/${repoName}/issues`, {
method: "POST",
headers: {
Authorization: `Bearer ${token}`,
Accept: "application/vnd.github+json",
"Content-Type": "application/json"
},
body: JSON.stringify({
title: `Firm rank changes detected — ${new Date().toISOString().slice(0,10)}`,
body,
labels: ["data-check"]
})
});

if (!res.ok) {
console.error("Failed to create issue:", res.status, await res.text());
process.exit(1);
}

console.log("Issue created successfully.");
