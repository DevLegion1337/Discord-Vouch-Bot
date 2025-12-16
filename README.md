# Vouch Bot

A Discord bot for managing vouches with role-based access control and automatic backup/restore functionality.

## Features

- `/vouch` command with star rating (1-5), product channel, reason, and optional proof
- Beautiful embed design for vouches
- Role-based access control
- Channel restriction (only works in designated channel)
- Automatic vouch storage in JSON database
- `/restore-vouches` command to restore vouches after server nuking
- Owner-only restore command protection

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy the example environment file:
```bash
cp .env.example .env
```

3. Edit `.env` with your bot details:
```
BOT_TOKEN=YOUR_BOT_TOKEN_HERE
CHANNEL_ID=YOUR_CHANNEL_ID_HERE
VOUCH_ROLE_ID=ROLE_ID_REQUIRED_FOR_VOUCH_COMMAND
OWNER_ROLE_ID=ROLE_ID_REQUIRED_FOR_RESTORE_COMMAND
```

4. Get your bot token from [Discord Developer Portal](https://discord.com/developers/applications)

5. Invite your bot with the following permissions:
   - Send Messages
   - Embed Links
   - Use Slash Commands

6. Start the bot:
```bash
npm start
```

## Commands

### `/vouch`
Create a new vouch.

**Parameters:**
- `stars` (required): Rating from 1-5
- `product-channel` (required): Product channel name or ID
- `reason` (required): Reason for the vouch
- `proof` (optional): Proof/evidence

**Requirements:**
- Must have the role specified in `VOUCH_ROLE_ID`
- Must be used in the channel specified in `CHANNEL_ID`

### `/restore-vouches`
Restore all vouches from the database to the configured channel.

**Requirements:**
- Must have the role specified in `OWNER_ROLE_ID`

## Data Storage

Vouches are stored in `vouches.json` in the following format:
```json
{
  "GUILD_ID": [
    {
      "userId": "USER_ID",
      "username": "USERNAME#TAG",
      "stars": 5,
      "productChannel": "product-name",
      "reason": "Great service!",
      "proof": "https://example.com/proof",
      "timestamp": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

## License

MIT

