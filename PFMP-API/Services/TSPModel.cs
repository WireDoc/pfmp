using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace PFMP_API.Services
{
    /// <summary>
    /// Model representing TSP fund prices from DailyTSP.com API
    /// </summary>
    [JsonConverter(typeof(TSPJsonConverter))]
    public class TSPModel
    {
        public DateOnly Date { get; set; }
        public double CFund { get; set; }
        public double FFund { get; set; }
        public double GFund { get; set; }
        public double IFund { get; set; }
        public double L2025 { get; set; }
        public double L2030 { get; set; }
        public double L2035 { get; set; }
        public double L2040 { get; set; }
        public double L2045 { get; set; }
        public double L2050 { get; set; }
        public double L2055 { get; set; }
        public double L2060 { get; set; }
        public double L2065 { get; set; }
        public double L2070 { get; set; }
        public double L2075 { get; set; }
        public double LIncome { get; set; }
        public double SFund { get; set; }
    }

    /// <summary>
    /// Custom JSON converter for TSP API response format
    /// DailyTSP API returns data in format: { "2025-10-28": { "C Fund": 102.1952, ... } }
    /// </summary>
    public class TSPJsonConverter : JsonConverter<TSPModel>
    {
        public override TSPModel Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            TSPModel tspModel = new();

            // Start reading the root object
            if (reader.TokenType != JsonTokenType.StartObject)
            {
                throw new JsonException("Expected StartObject token");
            }

            reader.Read(); // Move to property name (date)
            
            if (reader.TokenType == JsonTokenType.PropertyName)
            {
                string? dateString = reader.GetString();
                if (DateOnly.TryParse(dateString, out DateOnly date))
                {
                    tspModel.Date = date;
                }

                reader.Read(); // Move to StartObject for fund data
                
                if (reader.TokenType == JsonTokenType.StartObject)
                {
                    // Read fund prices
                    while (reader.Read() && reader.TokenType != JsonTokenType.EndObject)
                    {
                        if (reader.TokenType == JsonTokenType.PropertyName)
                        {
                            // Fund names come with spaces, e.g. "C Fund", "L 2050"
                            string? propName = reader.GetString()?.Replace(" ", string.Empty);
                            reader.Read(); // Move to the value
                            
                            if (reader.TokenType == JsonTokenType.Number && !string.IsNullOrEmpty(propName))
                            {
                                if (reader.TryGetDouble(out double value))
                                {
                                    PropertyInfo? prop = tspModel.GetType().GetProperty(propName);
                                    prop?.SetValue(tspModel, value);
                                }
                            }
                        }
                    }
                    
                    // Read the closing brace of the root object
                    reader.Read();
                }
            }
            
            return tspModel;
        }

        public override void Write(Utf8JsonWriter writer, TSPModel value, JsonSerializerOptions options)
        {
            throw new NotImplementedException("TSPModel serialization not implemented");
        }
    }
}
