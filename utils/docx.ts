import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, StopType, UnderlineType } from "docx";
import * as FileSaver from "file-saver";
import { CVData } from "../types";

// Adhoc Brand Colors converted to hex strings without hash for docx
const COLORS = {
  VIOLETA: "7C6CD8",
  LAVANDA: "BCAFEF",
  CORAL: "FF7348",
  MOSTAZA: "FEA912",
  DARK: "2D2D2D",
  GRAY: "666666",
  LIGHT_GRAY: "F3F4F6",
};

export const generateATSDocx = async (data: CVData) => {
  // Helper for Section Titles
  const createSectionTitle = (title: string) => {
    return new Paragraph({
      text: title.toUpperCase(),
      heading: HeadingLevel.HEADING_2,
      spacing: {
        before: 300,
        after: 150,
      },
      border: {
        bottom: {
          color: COLORS.LIGHT_GRAY,
          space: 1,
          style: BorderStyle.SINGLE,
          size: 6,
        },
      },
    });
  };

  const doc = new Document({
    styles: {
      default: {
        heading1: {
          run: {
            font: "Lora",
            size: 52, // 26pt
            bold: true,
            color: COLORS.VIOLETA,
          },
          paragraph: {
            spacing: { after: 120 },
          },
        },
        heading2: {
          run: {
            font: "Lora",
            size: 24, // 12pt
            bold: true,
            color: COLORS.DARK,
          },
        },
        document: {
          run: {
            font: "Calibri", // Standard ATS font (fallback for Poppins)
            size: 22, // 11pt
            color: COLORS.DARK,
          },
        },
      },
    },
    sections: [
      {
        properties: {},
        children: [
          // --- Header ---
          new Paragraph({
            text: data.fullName.toUpperCase(),
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.LEFT,
          }),
          
          // Contact Info
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [
              new TextRun({
                text: [
                  data.contactInfo.email,
                  data.contactInfo.phone,
                  data.contactInfo.linkedin?.replace(/^https?:\/\/(www\.)?/, ''),
                  data.contactInfo.location
                ].filter(Boolean).join("  |  "),
                color: COLORS.GRAY,
                size: 20, // 10pt
              }),
            ],
            spacing: {
              after: 300,
            },
          }),

          // --- Professional Summary ---
          ...(data.professionalSummary ? [
            createSectionTitle("Perfil Profesional"),
            new Paragraph({
              children: [
                new TextRun({
                  text: data.professionalSummary,
                }),
              ],
            }),
          ] : []),

          // --- Experience ---
          ...(data.experience?.length > 0 ? [
            createSectionTitle("Experiencia Laboral"),
            ...data.experience.flatMap((exp) => [
              // Role and Dates
              new Paragraph({
                children: [
                  new TextRun({
                    text: exp.role,
                    bold: true,
                    size: 24, // 12pt
                  }),
                  new TextRun({
                    text: `\t${exp.dates}`,
                    bold: true,
                    color: COLORS.VIOLETA,
                    size: 20,
                  }),
                ],
                tabStops: [
                  {
                    type: StopType.RIGHT,
                    position: 9000, // Approximate right align
                  },
                ],
                spacing: { before: 200 },
              }),
              // Company
              new Paragraph({
                children: [
                  new TextRun({
                    text: exp.company,
                    color: COLORS.CORAL,
                    bold: true,
                  }),
                ],
                spacing: { after: 100 },
              }),
              // Bullets
              ...exp.description.map(desc => 
                new Paragraph({
                  text: desc,
                  bullet: {
                    level: 0,
                  },
                })
              )
            ])
          ] : []),

          // --- Education ---
          ...(data.education?.length > 0 ? [
            createSectionTitle("Educación"),
            ...data.education.flatMap((edu) => [
              new Paragraph({
                children: [
                  new TextRun({
                    text: edu.institution,
                    bold: true,
                  }),
                  new TextRun({
                    text: `\t${edu.year}`,
                    color: COLORS.GRAY,
                    size: 20,
                  }),
                ],
                tabStops: [
                  {
                    type: StopType.RIGHT,
                    position: 9000,
                  },
                ],
                spacing: { before: 100 },
              }),
              new Paragraph({
                text: edu.degree,
              }),
            ])
          ] : []),

          // --- Skills ---
          ...(data.skills?.length > 0 ? [
            createSectionTitle("Habilidades"),
            new Paragraph({
              children: [
                new TextRun({
                  text: data.skills.join("  •  "),
                }),
              ],
            }),
          ] : []),

          // --- Languages ---
          ...(data.languages?.length > 0 ? [
            createSectionTitle("Idiomas"),
            new Paragraph({
              children: [
                new TextRun({
                  text: data.languages.join("  •  "),
                }),
              ],
            }),
          ] : []),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  // Handle default or named export from file-saver depending on how esm.sh bundles it
  const save = FileSaver.saveAs || (FileSaver as any).default?.saveAs || (FileSaver as any).default;
  if (typeof save === 'function') {
      save(blob, `${data.fullName.replace(/\s+/g, '_')}_CV_Optimizado.docx`);
  } else {
      console.error("Could not find saveAs function in file-saver import");
  }
};