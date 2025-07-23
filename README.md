# Freemasons Community Webapp

A private social platform designed exclusively for Freemasons. It enables communication, engagement, and information sharing between district leadership, lodge secretaries, and members (brothers) in a secure environment.

## Features

- **User Authentication & Authorization**: Secure login with role-based permissions
- **User Profiles**: Detailed member profiles with Masonic information
- **Content Management**: Post creation with approval workflow
- **Events Page**: Event creation, attendance tracking, and notifications
- **Candidate Wall**: Vetting process for potential candidates
- **Official News Page**: District and lodge announcements
- **Search & Discovery**: Find members and content easily

## Tech Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Authentication**: NextAuth.js
- **Database**: Prisma ORM (with your choice of database)
- **Styling**: Tailwind CSS with custom Masonic theme

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/freemasons-community.git
   cd freemasons-community
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the root directory with the following variables:
   ```
   DATABASE_URL="your-database-connection-string"
   NEXTAUTH_SECRET="your-nextauth-secret"
   NEXTAUTH_URL="http://localhost:3000"
   ```

4. Initialize the database:
   ```bash
   npx prisma migrate dev
   ```

5. Run the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Project Structure

```
freemasons-community/
├── public/              # Static assets
├── src/
│   ├── app/             # Next.js App Router
│   ├── components/      # Reusable UI components
│   ├── lib/             # Utility functions and libraries
│   ├── models/          # Data models and types
│   └── utils/           # Helper functions
├── prisma/              # Database schema and migrations
├── .env.local           # Environment variables (create this)
├── next.config.js       # Next.js configuration
├── package.json         # Project dependencies
├── tailwind.config.js   # Tailwind CSS configuration
└── tsconfig.json        # TypeScript configuration
```

## User Roles

- **District Administrator (Super Admin)**: Full access to all features and content
- **Lodge Secretary (Lodge Admin)**: Full access to their lodge's content and members
- **Lodge Member (Brother)**: Limited to content creation (pending approval) and viewing

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- Freemasons community for their input and requirements
- Next.js team for the amazing framework
- Tailwind CSS for the styling system 