#!/bin/sh
input=$(cat)

# ── Statusline JSON ───────────────────────────────────────────────────────
cwd=$(echo "$input" | jq -r '.cwd')
model=$(echo "$input" | jq -r '.model.display_name')
ctx_used_tok=$(echo "$input" | jq -r '.context_window.total_input_tokens // empty')
ctx_total=$(echo "$input" | jq -r '.context_window.context_window_size // empty')
used=$(echo "$input" | jq -r '.context_window.used_percentage // empty')
session=$(echo "$input" | jq -r '.session_id // empty')
remaining=$(echo "$input" | jq -r '.context_window.remaining_percentage // empty')

# Context snapshot for external tooling
if [ -n "$session" ] && [ -n "$remaining" ]; then
  used_pct=$(awk "BEGIN { r=($remaining-16.5)/83.5*100; if(r<0)r=0; u=100-r; if(u<0)u=0; if(u>100)u=100; printf \"%.0f\",u }")
  tmpdir="${TMPDIR:-/tmp}"
  printf '{"session_id":"%s","remaining_percentage":%s,"used_pct":%s,"timestamp":%s}\n' \
    "$session" "$remaining" "$used_pct" "$(date +%s)" \
    > "${tmpdir%/}/claude-ctx-${session}.json"
fi

# ── ccburn data (one call covers session + weekly) ────────────────────────
ccburn_json=$(ccburn session --json --once 2>/dev/null)

sess_util=$(echo "$ccburn_json"     | jq -r '.limits.session.utilization // empty')
proj_end=$(echo "$ccburn_json"      | jq -r '.projection.projected_end_pct // empty')
sess_resets_min=$(echo "$ccburn_json" | jq -r '.limits.session.resets_in_minutes // empty')

weekly_util=$(echo "$ccburn_json"       | jq -r '.limits.weekly.utilization // empty')
weekly_resets_hrs=$(echo "$ccburn_json" | jq -r '.limits.weekly.resets_in_hours // empty')
weekly_resets_min=$(echo "$ccburn_json" | jq -r '.limits.weekly.resets_in_minutes // empty')

# ── Helpers ──────────────────────────────────────────────────────────────
fmt_tokens() {
  awk -v t="$1" 'BEGIN {
    if (t >= 1000000) printf "%.1fM", t/1000000
    else if (t >= 1000) printf "%.0fk", t/1000
    else printf "%d", t
  }'
}

fmt_mins() {
  awk -v m="$1" 'BEGIN {
    mi = int(m + 0.5); h = int(mi / 60); r = mi % 60
    if (h > 0) printf "%dh %dm", h, r
    else printf "%dm", r
  }'
}

fmt_hrs_as_days() {
  awk -v h="$1" 'BEGIN {
    hi = int(h + 0.5); d = int(hi / 24); r = hi % 24
    if (d > 0) printf "%dd %dh", d, r
    else printf "%dh", hi
  }'
}

# ── Colors ────────────────────────────────────────────────────────────────
c_brown='\033[38;2;201;100;66m'
c_git='\033[38;2;240;80;51m'
c_teal='\033[38;2;86;182;194m'
c_green='\033[32m'
c_yellow='\033[33m'
c_red='\033[31m'
c_dim='\033[2m'
c_bold='\033[1m'
c_reset='\033[0m'

# ── Context (150k limit: green <80k, yellow 80k-120k, red >=120k) ─────────
[ -z "$ctx_total" ] && ctx_total=150000
if [ -z "$ctx_used_tok" ] && [ -n "$used" ]; then
  ctx_used_tok=$(awk -v p="$used" -v t="$ctx_total" 'BEGIN { printf "%.0f", p*t/100 }')
fi

ctx_display=""
ctx_color="$c_green"
if [ -n "$ctx_used_tok" ]; then
  ctx_display="$(fmt_tokens "$ctx_used_tok")/150k"
  ctx_tok_int=$(printf '%.0f' "$ctx_used_tok")
  if [ "$ctx_tok_int" -ge 120000 ]; then ctx_color="$c_red"
  elif [ "$ctx_tok_int" -ge 80000 ]; then ctx_color="$c_yellow"
  fi
fi

# ── 5h session (proj color: green <90%, yellow >=90%+reset<=30m, red else) ─
sess_pct=""
proj_display=""
proj_color="$c_green"
reset_display=""
if [ -n "$sess_util" ]; then
  sess_pct=$(awk -v u="$sess_util" 'BEGIN { printf "%.0f", u * 100 }')

  if [ -n "$proj_end" ]; then
    proj_int=$(awk -v p="$proj_end" 'BEGIN { printf "%.0f", p }')
    proj_display=$(printf '%s%%' "$proj_int")
    if [ "$proj_int" -ge 90 ]; then
      resets_int=$(awk -v r="${sess_resets_min:-999}" 'BEGIN { printf "%.0f", r }')
      if [ "$resets_int" -le 30 ]; then proj_color="$c_yellow"
      else proj_color="$c_red"
      fi
    fi
  fi

  [ -n "$sess_resets_min" ] && reset_display=$(fmt_mins "$sess_resets_min")
fi

# ── Weekly (green <50%, yellow 50-80%, red >=80%) ─────────────────────────
weekly_pct=""
weekly_color="$c_green"
weekly_days_display=""
if [ -n "$weekly_util" ]; then
  weekly_pct=$(awk -v u="$weekly_util" 'BEGIN { printf "%.0f", u * 100 }')
  if [ "$weekly_pct" -ge 80 ]; then weekly_color="$c_red"
  elif [ "$weekly_pct" -ge 50 ]; then weekly_color="$c_yellow"
  fi
  if [ -n "$weekly_resets_hrs" ]; then
    weekly_days_display=$(fmt_hrs_as_days "$weekly_resets_hrs")
  elif [ -n "$weekly_resets_min" ]; then
    weekly_days_display=$(fmt_mins "$weekly_resets_min")
  fi
fi

# ── Git ───────────────────────────────────────────────────────────────────
if git -C "$cwd" rev-parse --git-dir > /dev/null 2>&1; then
  git_branch=$(git -C "$cwd" symbolic-ref --short HEAD 2>/dev/null \
    || git -C "$cwd" rev-parse --short HEAD 2>/dev/null)
  git_status=$(git -C "$cwd" status --porcelain 2>/dev/null)
  if [ -n "$git_status" ]; then
    staged=$(printf '%s\n' "$git_status" | grep -c '^[MADRC]' || true)
    modified=$(printf '%s\n' "$git_status" | grep -c '^.[MD]' || true)
    untracked=$(printf '%s\n' "$git_status" | grep -c '^??' || true)
    conflicts=$(printf '%s\n' "$git_status" | grep -c '^[UD][UD]' || true)
  else
    staged=0; modified=0; untracked=0; conflicts=0
  fi
  indicators=""
  [ "$conflicts" -gt 0 ] && indicators="${indicators} \033[31m✖${conflicts}\033[0m"
  [ "$staged"    -gt 0 ] && indicators="${indicators} \033[32m●${staged}\033[0m"
  [ "$modified"  -gt 0 ] && indicators="${indicators} \033[33m✚${modified}\033[0m"
  [ "$untracked" -gt 0 ] && indicators="${indicators} \033[34m…${untracked}\033[0m"
  [ -z "$indicators" ]   && indicators=" \033[32m✔\033[0m"
  git_part=$(printf '%b%b' "${c_git}${git_branch}${c_reset}" "$indicators")
else
  git_part=$(printf '%b' "${c_dim}not a git repo${c_reset}")
fi

# ── Line 1: [time]  dir  git ──────────────────────────────────────────────
cwd_display=$(echo "$cwd" | sed "s|$HOME|~|")
printf "${c_yellow}[%s]${c_reset}  ${c_teal}%s${c_reset}  %b\n" \
  "$(date +%H:%M:%S)" "$cwd_display" "$git_part"

# ── Line 2: model  ctx  │  5h  │  7d ─────────────────────────────────────
printf "${c_brown}%s${c_reset}" "$model"

[ -n "$ctx_display" ] && \
  printf "  ${ctx_color}${c_bold}%9s${c_reset}" "$ctx_display"

if [ -n "$sess_pct" ]; then
  printf "  ${c_dim}│${c_reset}  ${proj_color}${c_bold}%3s%%${c_reset}" "$sess_pct"
  [ -n "$proj_display" ] && \
    printf " ${proj_color}→ ~%4s${c_reset}" "$proj_display"
  [ -n "$reset_display" ] && \
    printf "  ${c_dim}↺ %6s${c_reset}" "$reset_display"
fi

if [ -n "$weekly_pct" ]; then
  printf "  ${c_dim}│${c_reset}  ${weekly_color}${c_bold}%3s%%${c_reset}" "$weekly_pct"
  [ -n "$weekly_days_display" ] && \
    printf "  ${c_dim}%s${c_reset}" "$weekly_days_display"
fi

printf '\n'
