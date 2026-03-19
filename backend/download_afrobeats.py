import os
import subprocess
import time

songs_list = [
    "Rema Charm", "Rema Holiday", "Rema Reason You", "Davido Unavailable", "Davido Feel",
    "Davido No Competition", "Burna Boy City Boys", "Burna Boy Sittin' On Top Of The World",
    "Asake Lonely At The Top", "Asake Amapiano", "Asake Sunshine", "Ayra Starr Rush",
    "Ayra Starr Commas", "Omah Lay Soso", "Omah Lay Holy Ghost", "Fireboy DML Yawa",
    "Fireboy DML Everyday", "Wizkid Money & Love", "Wizkid Ebelebe", "Tems Me & U",
    "Tems Love Me Jeje", "Victony Soweto", "Victony Everything", "BNXN Gwagwalada",
    "BNXN Sweet Tea", "Kizz Daniel Twe Twe", "Kizz Daniel Showa", "Ruger Asiwaju",
    "Ruger Tour", "Zinoleesky Many Things", "Zinoleesky Sakara", "Blaqbonez Like Ice Spice",
    "Blaqbonez Fire On Me", "Odumodublvck Declan Rice", "Odumodublvck Blood On The Dance Floor",
    "Young Jonn Aquafina", "Young Jonn Big Big Things", "Seyi Vibez Hat Trick",
    "Seyi Vibez Different Pattern", "Spyro Who Is Your Guy", "Spyro Only Fine Girl",
    "Shallipopi Elon Musk", "Shallipopi Cast", "Tekno Peace of Mind", "Tekno No Forget",
    "Joeboy Body & Soul", "Joeboy Adenuga", "Lojay Monalisa Remix", "Lojay Canada",
    "Mayorkun For Daddy", "Mayorkun Lowkey", "CKay Love Nwantiti Remix", "CKay Is It You",
    "Oxlade Ku Lo Sa Remix", "Oxlade Arabambi", "Bella Shmurda Philo", "Bella Shmurda My Brother",
    "Adekunle Gold Party No Dey Stop", "Adekunle Gold Rodo", "Tyla Water", "Tyla Truth or Dare",
    "Pheelz Finesse Remix", "Pheelz Stand By You", "Victony Jaga Jaga", "Zlatan Omo Ologo",
    "Zlatan 10 Bottles", "Reekado Banks Feel Different", "Reekado Banks Eden",
    "Chike Ego Oyibo", "Chike Man Not God", "Falz Yakubu", "Falz NDLEA", "Teni No Days Off",
    "Teni Malaika", "Peruzzi Pressure", "Peruzzi Sabali", "Ladipoe Hallelujah",
    "Ladipoe Compose", "Magixx Okay", "Magixx All Over", "Boy Spyce Folake", "Boy Spyce You",
    "Rema Charm", "Rema Holiday", "Rema Reason You", "Davido Unavailable", "Davido Feel",
    "Davido No Competition", "Burna Boy City Boys", "Burna Boy Sittin' On Top Of The World",
    "Asake Lonely At The Top", "Asake Amapiano", "Asake Sunshine", "Ayra Starr Rush",
    "Ayra Starr Commas", "Omah Lay Soso", "Omah Lay Holy Ghost", "Fireboy DML Yawa",
    "Fireboy DML Everyday", "Wizkid Money & Love"
]

# Deduplicate the list to avoid downloading the same song twice (some repeats at the end of the raw text)
songs_list = list(dict.fromkeys(songs_list))

output_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "media/music"))
os.makedirs(output_dir, exist_ok=True)

print(f"Starting download of {len(songs_list)} unique Afrobeats songs...")

# Iterate and download
for idx, query in enumerate(songs_list, 1):
    print(f"[{idx}/{len(songs_list)}] Downloading: {query}")
    command = [
        "yt-dlp",
        "--extract-audio",
        "--audio-format", "mp3",
        "--audio-quality", "0",
        "--no-playlist",
        "--match-filter", "duration < 600 & duration > 60",
        "--output", f"{output_dir}/%(title)s.%(ext)s",
        f"ytsearch1:{query} audio"
    ]
    try:
        subprocess.run(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=45)
    except subprocess.TimeoutExpired:
        print(f"  [Timeout] Skipping {query}")
    except Exception as e:
        print(f"  [Error] Failed to download {query}: {e}")
    time.sleep(1)

print("All downloads completed!")
