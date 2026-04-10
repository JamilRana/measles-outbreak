export interface Outbreak {
  id: string;
  name: string;
  disease: {
    name: string;
    code: string;
  };
}
