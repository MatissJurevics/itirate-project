import type { Theme } from '@cloudscape-design/components/theming'

export const cloudscapeTheme: Theme = {
  tokens: {
    // Typography - use Instrument Serif for headings
    fontFamilyBase: "'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",

    // Border radius - clean, modern look
    borderRadiusButton: '0.5rem',
    borderRadiusContainer: '0.5rem',
    borderRadiusInput: '0.5rem',
    borderRadiusDropdown: '0.5rem',
    borderRadiusItem: '0.5rem',
    borderRadiusAlert: '0.5rem',
    borderRadiusFlashbar: '0.5rem',
    borderRadiusTiles: '0.5rem',
    borderRadiusPopover: '0.5rem',
    borderRadiusBadge: '0.5rem',

    // Colors - match the off-white background
    colorBackgroundLayoutMain: {
      light: 'rgb(248, 251, 248)',
      dark: 'rgb(28, 43, 31)',
    },

    colorBackgroundContainerContent: {
      light: 'rgb(255, 255, 255)',
      dark: 'rgb(43, 58, 44)',
    },

    colorBackgroundContainerHeader: {
      light: 'rgb(255, 255, 255)',
      dark: 'rgb(43, 58, 44)',
    },

    // Primary colors - green theme
    colorTextAccent: {
      light: 'rgb(48, 123, 52)',
      dark: 'rgb(77, 174, 80)',
    },

    colorBackgroundButtonPrimaryDefault: {
      light: 'rgb(48, 123, 52)',
      dark: 'rgb(77, 174, 80)',
    },

    colorBackgroundButtonPrimaryHover: {
      light: 'rgb(61, 143, 64)',
      dark: 'rgb(103, 187, 107)',
    },

    colorBackgroundButtonPrimaryActive: {
      light: 'rgb(25, 96, 31)',
      dark: 'rgb(70, 160, 74)',
    },

    // Borders
    colorBorderDividerDefault: {
      light: 'rgb(229, 229, 229)',
      dark: 'rgb(60, 73, 59)',
    },

    colorBorderContainerTop: {
      light: 'transparent',
      dark: 'transparent',
    },

    // Input and interactive elements
    colorBackgroundInputDefault: {
      light: 'rgb(255, 255, 255)',
      dark: 'rgb(43, 58, 44)',
    },

    colorBorderInputDefault: {
      light: 'rgb(223, 214, 201)',
      dark: 'rgb(60, 73, 59)',
    },

    // Muted/secondary elements
    colorBackgroundDropdownItemDefault: {
      light: 'rgb(255, 255, 255)',
      dark: 'rgb(43, 58, 44)',
    },

    colorBackgroundDropdownItemHover: {
      light: 'rgb(245, 245, 245)',
      dark: 'rgb(60, 73, 59)',
    },
  },

  contexts: {
    'top-navigation': {
      tokens: {
        colorBackgroundContainerContent: {
          light: 'rgb(255, 255, 255)',
          dark: 'rgb(28, 43, 31)',
        },
      },
    },

    header: {
      tokens: {
        colorBackgroundContainerContent: {
          light: 'rgb(255, 255, 255)',
          dark: 'rgb(28, 43, 31)',
        },
      },
    },

    flashbar: {
      tokens: {
        colorTextAccent: {
          light: 'rgb(48, 123, 52)',
          dark: 'rgb(77, 174, 80)',
        },
      },
    },

    alert: {
      tokens: {
        colorTextAccent: {
          light: 'rgb(48, 123, 52)',
          dark: 'rgb(77, 174, 80)',
        },
      },
    },
  },
}
