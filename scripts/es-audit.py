#!/usr/bin/env python3
"""Crawl every ES page type on the local dev server, extract visible text,
and flag likely-English segments. Ground-truth audit: catches untranslated
strings regardless of source (messages, hardcoded, data)."""
import re, json, urllib.request

BASE = "http://localhost:3000"

# Representative ES URL per page type (one is enough to expose shared templates).
URLS = [
    "/es/",                                             # home
    "/es/ciudad-de-panama/",                            # city hub
    "/es/ciudad-de-panama/bella-vista/",                # neighborhood listing (DiscoveryView)
    "/es/ciudad-de-panama/casco-viejo/",                # neighborhood 2
    "/es/ciudad-de-panama/luna-cafe/",                  # venue PREMIUM
    "/es/ciudad-de-panama/al-gussto-albrook-mall/",     # venue BASIC
    "/es/ciudad-de-panama/cuisine/italian/",            # city-cuisine hub
    "/es/ciudad-de-panama/cuisine/",                    # cuisine index
    "/es/ciudad-de-panama/good-for/rooftop/",           # good-for facet
    "/es/ciudad-de-panama/good-for/",                   # good-for index
    "/es/ciudad-de-panama/bella-vista/italian/",        # hood+cuisine hub
    "/es/guides/best-coffee-panama-city/",              # guide article
    "/es/guides/",                                      # guides index
    "/es/search/?q=sushi",                              # search results
    "/es/search/",                                      # search zero-state
    "/es/saved/",                                       # saved list
    "/es/contact/", "/es/privacy/", "/es/terms/",       # static
    "/es/how-we-review/", "/es/newsletter/",            # trust + newsletter
]

# Strong English UI/jargon tells (any occurrence flags, case-insensitive whole word).
UI_TELLS = [
    "read the guide","read more","view all","see all","show more","show all","back to",
    "near me","open now","save","saved","share","directions","reviews","review","filter",
    "sort by","results","loading","near you","get directions","opening hours","hours",
    "menu","about","home","search","newsletter","subscribe","sign up","follow","listicles",
    "shortlists","what's good","best time","how we review","made in","learn more","browse",
    "explore","things to do","find","discover","the full list","in this guide","quick answers",
    "on the menu","message on whatsapp","full details","related","nearby","you might",
    "no results","try again","clear","apply","close","week","today","yesterday",
]
# English function words for ratio scoring.
EN_SIG = set(("the a an and or of to in on at for from with without your our their its this that these those "
    "is are was were be been being has have had do does did can could will would should may might must "
    "not no yes but so if then than as by about into over under more most best near open now you we they "
    "what where when who how why which while during between around through what's").split())
# Spanish tells (if present, the segment is Spanish, skip English scoring).
ES_SIG = set(("el la los las un una unos unas de del y o en con sin para por que qué cómo cuándo dónde "
    "más muy este esta esto estos cada como donde cuando su sus se no sí pero también entre sobre "
    "hasta desde nuestro nuestra abre cierra reservas cerca comer dónde platos horarios").split())

# Ignore chrome that is legitimately shared / proper nouns / brand.
IGNORE_SUBSTR = ["EatsPanama","WhatsApp","Instagram","Google","Panama","Panamá","OpenStreetMap",
    "Leaflet","© ","Space Grotesk"]

def visible_text(html):
    html = re.sub(r"(?s)<script.*?</script>", " ", html)
    html = re.sub(r"(?s)<style.*?</style>", " ", html)
    # keep segment boundaries at tags
    html = re.sub(r"<[^>]+>", "\n", html)
    html = re.sub(r"&amp;","&",html); html=re.sub(r"&#x27;|&rsquo;|&lsquo;","'",html)
    html = re.sub(r"&ldquo;|&rdquo;",'"',html); html=re.sub(r"&nbsp;"," ",html)
    html = re.sub(r"&[a-z]+;"," ",html)
    segs = [s.strip() for s in html.split("\n")]
    return [s for s in segs if s and len(s) > 2]

def es_ratio(seg):
    w = re.findall(r"[A-Za-zÁÉÍÓÚÑáéíóúñ']+", seg.lower())
    if not w: return 0,0,0
    en = sum(1 for x in w if x in EN_SIG)
    es = sum(1 for x in w if x in ES_SIG)
    return len(w), en, es

def flagged(seg):
    if any(sub in seg for sub in IGNORE_SUBSTR) and len(seg) < 40: return None
    low = " "+seg.lower()+" "
    # strong UI tell as a whole word/phrase
    for t in UI_TELLS:
        if re.search(r"(?<![a-z])"+re.escape(t)+r"(?![a-z])", low):
            # but not if the segment is clearly Spanish overall
            n,en,es = es_ratio(seg)
            if es >= 2 and es > en: return None
            return ("UI-tell:"+t, seg)
    n,en,es = es_ratio(seg)
    if n >= 4 and en >= 2 and en > es and en/n >= 0.30:
        return ("en-ratio %d/%d"%(en,n), seg)
    return None

report = {}
for u in URLS:
    try:
        req = urllib.request.Request(BASE+u, headers={"User-Agent":"es-audit"})
        html = urllib.request.urlopen(req, timeout=40).read().decode("utf-8","replace")
    except Exception as e:
        report[u] = [("FETCH-ERROR", str(e))]; continue
    seen=set(); hits=[]
    for seg in visible_text(html):
        if seg in seen: continue
        seen.add(seg)
        f = flagged(seg)
        if f: hits.append(f)
    report[u] = hits

with open("_es_crawl_report.txt","w",encoding="utf-8") as f:
    tot=0
    for u in URLS:
        hits=report[u]
        if not hits: continue
        f.write("\n=== %s  (%d) ===\n"%(u,len(hits)))
        for why,seg in hits:
            tot+=1; f.write("  [%s] %s\n"%(why, seg[:130]))
    f.write("\nTOTAL flagged: %d across %d pages\n"%(tot, sum(1 for u in URLS if report[u])))
print("done")
