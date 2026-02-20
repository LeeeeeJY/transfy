// Simple Spotify Web API helper using the user's access token
export async function getCurrentlyPlaying(accessToken: string) {
  const res = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (res.status === 204 || res.status > 400) {
    return null;
  }

  return res.json();
}

// Play a specific context (album, playlist, artist) or track, or resume if no URI provided
export async function play(accessToken: string, uri?: string) {
  try {
    const body = uri 
      ? (uri.startsWith("spotify:track:") ? { uris: [uri] } : { context_uri: uri })
      : undefined;

    await fetch("https://api.spotify.com/v1/me/player/play", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    console.error("Error playing context:", error);
  }
}

export async function pause(accessToken: string) {
  try {
    await fetch("https://api.spotify.com/v1/me/player/pause", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch (error) {
    console.error("Error pausing:", error);
  }
}

export async function next(accessToken: string) {
  try {
    await fetch("https://api.spotify.com/v1/me/player/next", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch (error) {
    console.error("Error skipping next:", error);
  }
}

export async function previous(accessToken: string) {
  try {
    await fetch("https://api.spotify.com/v1/me/player/previous", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch (error) {
    console.error("Error skipping previous:", error);
  }
}

export async function transferPlayback(accessToken: string, deviceId: string) {
  try {
    await fetch("https://api.spotify.com/v1/me/player", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        device_ids: [deviceId],
        play: true,
      }),
    });
  } catch (error) {
    console.error("Error transferring playback:", error);
  }
}
