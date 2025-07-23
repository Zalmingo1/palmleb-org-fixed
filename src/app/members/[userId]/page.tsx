import { headers } from 'next/headers';
import { getMemberById } from '@/lib/members';
import { getTokenData } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Mail, Phone, MapPin, Building, GraduationCap, Briefcase } from 'lucide-react';
import Link from 'next/link';

export default async function MemberPage({ params }: { params: Promise<{ userId: string }> }) {
  const headersList = headers();
  const tokenData = await getTokenData({ headers: headersList } as any);
  if (!tokenData) {
    return Response.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL));
  }

  const { userId } = await params;
  const member = await getMemberById(userId);
  if (!member) {
    return Response.redirect(new URL('/members', process.env.NEXT_PUBLIC_APP_URL));
  }

  return (
    <div className="container mx-auto py-8">
      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <Card className="md:col-span-1">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Avatar className="h-32 w-32">
                <AvatarImage src={member.image || undefined} alt={member.name} />
                <AvatarFallback>{member.name.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
              </Avatar>
            </div>
            <CardTitle className="text-2xl">{member.name}</CardTitle>
            <div className="flex justify-center gap-2 mt-2">
              <Badge variant="secondary">{member.role}</Badge>
              {member.isActive && <Badge>Active</Badge>}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{member.email}</span>
              </div>
              {member.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{member.phone}</span>
                </div>
              )}
              {member.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{member.location}</span>
                </div>
              )}
              {member.company && (
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span>{member.company}</span>
                </div>
              )}
              {member.education && (
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  <span>{member.education}</span>
                </div>
              )}
              {member.occupation && (
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span>{member.occupation}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Member since {new Date(member.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bio Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              {member.bio ? (
                <p>{member.bio}</p>
              ) : (
                <p className="text-muted-foreground">No bio available.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 flex justify-center">
        <Link href="/members" className="inline-block">
          <Button>Back to Members</Button>
        </Link>
      </div>
    </div>
  );
} 