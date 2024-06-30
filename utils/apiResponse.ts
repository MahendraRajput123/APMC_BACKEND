class ApiResponse<T> {
    public readonly success: boolean;
    constructor(
      public readonly status_code: number,
      public readonly data: T,
      public readonly message: string = "Success"
    ) {
      this.success = status_code < 400;
    }
  }
  
  export { ApiResponse };  