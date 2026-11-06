// Sunset Soul design tokens for iOS (SwiftUI).
// Generated from design-tokens.json. Colors switch with Light/Dark mode; fonts grow with Dynamic Type.
// Add the .ttf files in /fonts to the app target and list them under "Fonts provided by application" in Info.plist.

import SwiftUI
import UIKit

public enum SunsetSoul {

    // MARK: Colors
    public enum Colors {
        /// The brand color. App icon tile, dark-mode page, text color in light mode.
        public static let brandTwilightNavy = Color(light: (0x1D, 0x2B, 0x5C, 1.0), dark: (0x1D, 0x2B, 0x5C, 1.0))
        /// Second brand blue. The earth in the app icon and raised surfaces in dark mode.
        public static let brandBlueHour = Color(light: (0x27, 0x3A, 0x72, 1.0), dark: (0x27, 0x3A, 0x72, 1.0))
        /// Warm cream. Light-mode page and text on navy.
        public static let brandCream = Color(light: (0xFF, 0xF9, 0xF2, 1.0), dark: (0xFF, 0xF9, 0xF2, 1.0))
        /// The sun in the logo and every score. The one warm accent.
        public static let brandApricot = Color(light: (0xFF, 0x9B, 0x5C, 1.0), dark: (0xFF, 0x9B, 0x5C, 1.0))
        /// The beams in the logo on dark grounds and the selected reaction.
        public static let brandPeachBlush = Color(light: (0xFB, 0xD2, 0xBC, 1.0), dark: (0xFB, 0xD2, 0xBC, 1.0))
        /// The action blue in its light-mode strength.
        public static let brandOceanBlue = Color(light: (0x2C, 0x4A, 0x8C, 1.0), dark: (0x2C, 0x4A, 0x8C, 1.0))
        /// Screen background behind every photo and story.
        public static let surfacePage = Color(light: (0xFF, 0xF9, 0xF2, 1.0), dark: (0x1D, 0x2B, 0x5C, 1.0))
        /// Unselected reaction chips, text fields, sheets and cards on surface-page.
        public static let surfaceRaised = Color(light: (0xE6, 0xEC, 0xF8, 1.0), dark: (0x27, 0x3A, 0x72, 1.0))
        /// Areas set back from the page: the area behind sheets, empty states, the Share Page margins.
        public static let surfaceSunken = Color(light: (0xF4, 0xEF, 0xE7, 1.0), dark: (0x16, 0x22, 0x4A, 1.0))
        /// Borders of reaction chips, text fields and secondary buttons. 3:1 or better on surface-page and surface-raised, so controls are easy to find. Cards use no border.
        public static let borderSubtle = Color(light: (0x76, 0x83, 0x9F, 1.0), dark: (0x72, 0x86, 0xC4, 1.0))
        /// Hairlines between sections and above the tab bar.
        public static let divider = Color(light: (0xE4, 0xDE, 0xD3, 1.0), dark: (0x33, 0x46, 0x7E, 1.0))
        /// Titles, labels and primary text on surface-page and surface-raised. 11:1 or better in both themes.
        public static let ink = Color(light: (0x1D, 0x2B, 0x5C, 1.0), dark: (0xFF, 0xF6, 0xEC, 1.0))
        /// Story text, set in the story style, on surface-page.
        public static let inkStory = Color(light: (0x24, 0x30, 0x5A, 1.0), dark: (0xE3, 0xE9, 0xF8, 1.0))
        /// Dates, counts, the Wow reason line and other quiet text on surface-page and surface-raised. 5.6:1 or better.
        public static let inkMuted = Color(light: (0x4E, 0x5B, 0x85, 1.0), dark: (0xC3, 0xCD, 0xEB, 1.0))
        /// Warm accent text, such as Soul in the wordmark. Large text only (24px and up) in light mode.
        public static let inkAccent = Color(light: (0xC4, 0x62, 0x1F, 1.0), dark: (0xFF, 0x9B, 0x5C, 1.0))
        /// The one primary button per screen (Save, Send, Share) and the capture button. Lifted in dark mode so it shows on navy. The button is identified by its label; the fill is 2.4:1 against navy in dark mode.
        public static let action = Color(light: (0x2C, 0x4A, 0x8C, 1.0), dark: (0x3A, 0x64, 0xB8, 1.0))
        /// Text and icons on action.
        public static let onAction = Color(light: (0xFF, 0xFF, 0xFF, 1.0), dark: (0xFF, 0xFF, 0xFF, 1.0))
        /// Keyboard and accessibility focus outline, 3px, on every surface.
        public static let focusRing = Color(light: (0x2C, 0x4A, 0x8C, 1.0), dark: (0xFB, 0xD2, 0xBC, 1.0))
        /// Fill of a reaction chip the person has tapped (Wow, Wish I was there, Love this!).
        public static let reactionSelected = Color(light: (0xFB, 0xD2, 0xBC, 1.0), dark: (0xFB, 0xD2, 0xBC, 1.0))
        /// 1px border on reaction-selected so the chip reads as pressed.
        public static let reactionSelectedBorder = Color(light: (0xF2, 0xB0, 0x8E, 1.0), dark: (0xF2, 0xB0, 0x8E, 1.0))
        /// Text on reaction-selected.
        public static let onReaction = Color(light: (0x1D, 0x2B, 0x5C, 1.0), dark: (0x1D, 0x2B, 0x5C, 1.0))
        /// Score badge fill, on photos and beside titles.
        public static let score = Color(light: (0xFF, 0x9B, 0x5C, 1.0), dark: (0xFF, 0x9B, 0x5C, 1.0))
        /// Numbers on score. 6.5:1.
        public static let onScore = Color(light: (0x1D, 0x2B, 0x5C, 1.0), dark: (0x1D, 0x2B, 0x5C, 1.0))
        /// Behind white text laid over a photo (home-screen previews, share cards only).
        public static let photoScrim = Color(light: (0x16, 0x22, 0x4A, 0.55), dark: (0x16, 0x22, 0x4A, 0.55))
    }

    // MARK: Type (scales with Dynamic Type)
    public enum Typography {
        /// Welcome and onboarding headlines only. 40pt, line height 44pt.
        public static let display = Font.custom("Fraunces-SemiBold", size: 40, relativeTo: .largeTitle)
        /// Screen titles. 32pt, line height 38pt.
        public static let title1 = Font.custom("Fraunces-SemiBold", size: 32, relativeTo: .title)
        /// Entry titles on Entry Detail and the Share Page. 26pt, line height 32pt.
        public static let title2 = Font.custom("Fraunces-SemiBold", size: 26, relativeTo: .title2)
        /// Featured card titles in the Journal. 21pt, line height 26pt.
        public static let title3 = Font.custom("Fraunces-SemiBold", size: 21, relativeTo: .title3)
        /// Every story and friend note. Set in ink-story. 18pt, line height 28pt.
        public static let story = Font.custom("Fraunces-Regular", size: 18, relativeTo: .body)
        /// Instructions, prompts and settings text. 18pt, line height 26pt.
        public static let body = Font.custom("AtkinsonHyperlegible-Regular", size: 18, relativeTo: .body)
        /// Grid tile titles and emphasis inside body. 18pt, line height 26pt.
        public static let bodyStrong = Font.custom("AtkinsonHyperlegible-Bold", size: 18, relativeTo: .body)
        /// Buttons, reaction chips and the score number. 17pt, line height 22pt.
        public static let label = Font.custom("AtkinsonHyperlegible-Bold", size: 17, relativeTo: .headline)
        /// Dates, counts and the Wow reason line. The smallest reading size in the app. 15pt, line height 20pt.
        public static let caption = Font.custom("AtkinsonHyperlegible-Regular", size: 15, relativeTo: .footnote)
        /// Short uppercase section labels only, never sentences. 14pt, line height 18pt.
        public static let overline = Font.custom("AtkinsonHyperlegible-Bold", size: 14, relativeTo: .caption)
    }

    /// Extra space between lines, to add with .lineSpacing(), so text matches the design's line heights.
    public enum LineSpacing {
        public static let display: CGFloat = -4
        public static let title1: CGFloat = 0
        public static let title2: CGFloat = 1
        public static let title3: CGFloat = 1
        public static let story: CGFloat = 6
        public static let body: CGFloat = 4
        public static let bodyStrong: CGFloat = 4
        public static let label: CGFloat = 2
        public static let caption: CGFloat = 2
        public static let overline: CGFloat = 1
    }

    public enum Spacing {
        /// Gap between a number and its label.
        public static let space1: CGFloat = 4
        /// Gap between reaction chips and between a photo and its title.
        public static let space2: CGFloat = 8
        /// Gap between grid tiles.
        public static let space3: CGFloat = 12
        /// Screen side margins and card padding.
        public static let space4: CGFloat = 16
        /// Padding inside the story area.
        public static let space5: CGFloat = 20
        /// Gap between sections.
        public static let space6: CGFloat = 24
        /// Top of screen to the title.
        public static let space8: CGFloat = 32
        /// Breathing room above and below empty states.
        public static let space10: CGFloat = 40
    }

    public enum Radius {
        /// Score badges and small thumbnails.
        public static let sm: CGFloat = 10
        /// Photos, text fields and primary buttons.
        public static let md: CGFloat = 14
        /// Cards and bottom sheets.
        public static let lg: CGFloat = 20
        /// Reaction chips and the round capture button.
        public static let pill: CGFloat = 9999
    }

    public enum Size {
        /// Smallest tappable area for anything. Larger than the platform minimum, for our 50 to 65 audience.
        public static let tapMin: CGFloat = 48
        /// Primary and secondary buttons.
        public static let buttonHeight: CGFloat = 52
        /// Reaction chips.
        public static let chipHeight: CGFloat = 48
        /// The round capture button in the tab bar.
        public static let captureButton: CGFloat = 60
        /// Line icons in buttons and the tab bar.
        public static let icon: CGFloat = 24
        /// Bottom tab bar, not counting the phone's safe area.
        public static let tabBarHeight: CGFloat = 76
    }

}

private extension Color {
    /// A color that switches between light and dark mode automatically.
    init(light: (Int, Int, Int, Double), dark: (Int, Int, Int, Double)) {
        self.init(UIColor { traits in
            let c = traits.userInterfaceStyle == .dark ? dark : light
            return UIColor(red: CGFloat(c.0) / 255, green: CGFloat(c.1) / 255, blue: CGFloat(c.2) / 255, alpha: CGFloat(c.3))
        })
    }
}
