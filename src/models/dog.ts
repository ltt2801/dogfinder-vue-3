export interface DogMeasurement {
  imperial: string
  metric: string
}

export interface DogImage {
  id: string
  url: string
  width?: number
  height?: number
  breeds?: DogBreed[]
  categories?: string[]
  colours?: string[]
}

export interface DogBreed {
  id: number
  name: string
  weight?: DogMeasurement
  height?: DogMeasurement
  bred_for?: string
  breed_group?: string
  life_span?: string
  temperament?: string
  origin?: string
  reference_image_id?: string
  image?: DogImage
}
