import React, { useMemo } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import {
  ArrowForward,
  CloudDownload,
  DesktopWindows,
  LaptopMac,
  PlayCircleOutline,
  School,
  Security,
  SmartDisplay,
  Smartphone,
  Tv,
} from '@mui/icons-material';
import { downloadGroups } from '../../config/downloadLinks';
import './LandingPage.css';

const storyCards = [
  {
    title: 'A living learning universe',
    description:
      'Family Academy connects students, teachers, parents, and devices into one controlled system. The result is not a brochure site, but a working platform with a clear path from discovery to study to support.',
  },
  {
    title: 'Built for motion, not static pages',
    description:
      'The landing page is designed like a cinematic opening scene. It uses layered light, shifting background forms, and chapter-style sections instead of a generic stack of blocks.',
  },
  {
    title: 'Downloads where people actually need them',
    description:
      'Visitors can reach the client and TV builds from the same entry point, without hunting through dashboards or multiple repositories.',
  },
];

const platformHighlights = [
  {
    icon: <Smartphone fontSize="inherit" />,
    label: 'Client app',
    detail: 'Learning, notes, exams, progress, and support on the move.',
  },
  {
    icon: <Tv fontSize="inherit" />,
    label: 'TV app',
    detail: 'A living-room companion for guided viewing and continuity.',
  },
  {
    icon: <Security fontSize="inherit" />,
    label: 'Governed access',
    detail: 'Role-based control for admins, teachers, and learners.',
  },
  {
    icon: <School fontSize="inherit" />,
    label: 'Academic flow',
    detail: 'Schools, courses, chapters, notes, questions, and exams.',
  },
];

const iconByLabel = {
  'Windows Installer': <DesktopWindows fontSize="inherit" />,
  'Windows Portable Zip': <DesktopWindows fontSize="inherit" />,
  'macOS Zip': <LaptopMac fontSize="inherit" />,
  'Linux Tarball': <LaptopMac fontSize="inherit" />,
  'Android APK Pack': <Smartphone fontSize="inherit" />,
  'Play Store Bundle': <CloudDownload fontSize="inherit" />,
  'Android TV APK': <Tv fontSize="inherit" />,
  'Android TV Bundle': <PlayCircleOutline fontSize="inherit" />,
  'Linux TV Bundle': <DesktopWindows fontSize="inherit" />,
  'macOS TV Zip': <LaptopMac fontSize="inherit" />,
};

const LandingPage = () => {
  const navigate = useNavigate();
  const downloadSections = useMemo(() => downloadGroups, []);

  return (
    <Box className="landing-shell">
      <Box className="landing-orbit landing-orbit-a" />
      <Box className="landing-orbit landing-orbit-b" />
      <Box className="landing-orbit landing-orbit-c" />
      <Box className="landing-grid" />

      <Box className="landing-hero">
        <Container maxWidth="lg" className="landing-container">
          <Stack direction="row" alignItems="center" justifyContent="space-between" className="landing-topbar">
            <Chip
              label="Family Academy"
              className="landing-chip"
              icon={<SmartDisplay />}
              variant="outlined"
            />
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                size="small"
                color="inherit"
                className="landing-secondary-button"
                onClick={() => navigate('/login')}
              >
                Admin access
              </Button>
              <Button
                size="small"
                variant="contained"
                className="landing-primary-button"
                endIcon={<ArrowForward />}
                onClick={() => document.getElementById('downloads')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Download builds
              </Button>
            </Stack>
          </Stack>

          <Grid container spacing={6} alignItems="center" className="landing-hero-grid">
            <Grid item xs={12} md={7}>
              <Box className="opening-card">
                <Typography className="opening-eyebrow">
                  A story of learning, control, and continuity
                </Typography>
                <Typography variant="h1" className="opening-title">
                  Family Academy
                </Typography>
                <Typography className="opening-subtitle">
                  A cinematic launch page for the platform that connects the student client, the TV experience,
                  and the admin command center into one coherent ecosystem.
                </Typography>

                <Stack direction="row" spacing={2} flexWrap="wrap" className="opening-actions">
                  <Button
                    variant="contained"
                    size="large"
                    className="landing-primary-button"
                    endIcon={<ArrowForward />}
                    onClick={() => document.getElementById('downloads')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    Start download
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    className="landing-secondary-button"
                    component={RouterLink}
                    to="/login"
                  >
                    Open admin
                  </Button>
                </Stack>

                <Stack direction="row" spacing={1.5} flexWrap="wrap" className="opening-tags">
                  <Chip label="Client app" className="opening-tag" />
                  <Chip label="TV app" className="opening-tag" />
                  <Chip label="Admin tools" className="opening-tag" />
                  <Chip label="Backend driven" className="opening-tag" />
                </Stack>
              </Box>
            </Grid>

            <Grid item xs={12} md={5}>
              <Box className="hero-panel">
                <Typography variant="overline" className="panel-label">
                  Opening credits
                </Typography>
                <Typography className="panel-title">
                  A single system, told in chapters
                </Typography>
                <Box className="panel-stack">
                  {platformHighlights.map((item) => (
                    <Box key={item.label} className="panel-item">
                      <Box className="panel-icon">{item.icon}</Box>
                      <Box>
                        <Typography className="panel-item-title">{item.label}</Typography>
                        <Typography className="panel-item-text">{item.detail}</Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Box className="landing-section landing-story">
        <Container maxWidth="lg">
          <Typography className="section-kicker">The Story</Typography>
          <Typography variant="h2" className="section-title">
            Built to feel like a sequence, not a brochure.
          </Typography>
          <Grid container spacing={3} className="story-grid">
            {storyCards.map((card, index) => (
              <Grid item xs={12} md={4} key={card.title}>
                <Card className={`story-card story-card-${index + 1}`}>
                  <CardContent>
                    <Typography className="story-index">0{index + 1}</Typography>
                    <Typography variant="h5" className="story-title">
                      {card.title}
                    </Typography>
                    <Typography className="story-copy">{card.description}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      <Box className="landing-section landing-downloads" id="downloads">
        <Container maxWidth="lg">
          <Stack spacing={2} className="downloads-header">
            <Typography className="section-kicker">Downloads</Typography>
            <Typography variant="h2" className="section-title">
              Give visitors the client and TV builds from one elegant front door.
            </Typography>
            <Typography className="section-copy">
              The buttons below are wired through environment variables first, with predictable fallback paths
              for a hosted downloads folder. That keeps the site clean and makes the links easy to swap for your
              production storage.
            </Typography>
          </Stack>

          <Grid container spacing={3} className="download-grid">
            {downloadSections.map((group) => (
              <Grid item xs={12} md={6} key={group.title}>
                <Card className="download-card">
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                      <Box>
                        <Typography className="download-kicker">{group.accent}</Typography>
                        <Typography variant="h4" className="download-title">
                          {group.title}
                        </Typography>
                        <Typography className="download-subtitle">{group.subtitle}</Typography>
                      </Box>
                      <Chip label={`${group.items.length} builds`} className="download-count" />
                    </Stack>

                    <Divider className="download-divider" />

                    <Grid container spacing={1.5}>
                      {group.items.map((item) => (
                        <Grid item xs={12} sm={6} key={item.label}>
                          <Box className="build-pill">
                            <Box className="build-pill-top">
                              <Box className="build-pill-icon">{iconByLabel[item.label] ?? <CloudDownload fontSize="inherit" />}</Box>
                              <Typography className="build-pill-title">{item.label}</Typography>
                            </Box>
                            <Typography className="build-pill-note">{item.note}</Typography>
                            <Button
                              variant="contained"
                              fullWidth
                              className="landing-primary-button landing-download-button"
                              href={item.url}
                              target="_blank"
                              rel="noreferrer"
                              endIcon={<ArrowForward />}
                            >
                              Download
                            </Button>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      <Box className="landing-section landing-footer">
        <Container maxWidth="lg">
          <Grid container spacing={3} alignItems="flex-start">
            <Grid item xs={12} md={6}>
              <Typography className="section-kicker">Support</Typography>
              <Typography variant="h2" className="section-title">
                Built for launch, support, and a clean handoff.
              </Typography>
              <Typography className="section-copy">
                If you want this landing page to point at a specific CDN, GitHub release asset, or storage bucket,
                set the download environment variables and the buttons will follow. That keeps the source clean and
                avoids hardcoding release links into the UI.
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box className="footer-card">
                <Typography className="footer-card-title">Next steps</Typography>
                <Stack spacing={1.25} className="footer-list">
                  <Typography>• Attach the public privacy policy and terms URLs.</Typography>
                  <Typography>• Point the download env vars at your hosted client and TV bundles.</Typography>
                  <Typography>• Replace the support email with the production inbox.</Typography>
                </Stack>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
};

export default LandingPage;

